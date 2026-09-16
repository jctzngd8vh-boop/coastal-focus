import { calculateOrderTotals, lineTotalCents as computeLineTotalCents } from "@/lib/orders/totals";
import { normalizeEmail, normalizePhone } from "@/lib/customers/normalize";
import { generateOrderStatusToken } from "@/lib/tokens";
import type {
  Customer,
  CustomerAddress,
  FulfillmentMethod,
  Order,
  OrderItem,
  PaymentMethod,
  ProductWithRelations,
  SelectedOption,
} from "@/types/database";
import type { CheckoutInput } from "@/lib/orders/schema";

export class OrderValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderValidationError";
  }
}

/**
 * The persistence seam. Production code implements this against Supabase
 * (see src/lib/orders/supabase-order-repo.ts); tests implement it in-memory.
 * Keeping this narrow (rather than passing a raw Supabase client into the
 * order-creation logic) is what makes the critical checkout workflow
 * unit-testable without a live database.
 */
export interface OrderRepo {
  getProductsByIds(ids: string[]): Promise<ProductWithRelations[]>;
  findOrderByIdempotencyKey(key: string): Promise<Order | null>;
  findCustomerByNormalized(
    phoneNormalized: string | null,
    emailNormalized: string | null
  ): Promise<Customer | null>;
  upsertCustomer(input: {
    id?: string;
    firstName: string;
    lastName: string;
    phone: string;
    phoneNormalized: string | null;
    email: string | null;
    emailNormalized: string | null;
    address?: CustomerAddress;
  }): Promise<Customer>;
  insertOrder(input: NewOrderRecord): Promise<Order>;
  insertOrderItems(orderId: string, items: NewOrderItemRecord[]): Promise<OrderItem[]>;
  insertStatusHistory(
    orderId: string,
    statusType: "fulfillment" | "payment",
    statusValue: string
  ): Promise<void>;
  applyInventoryDecrement(productId: string, quantity: number, orderId: string): Promise<void>;
}

export interface NewOrderRecord {
  customer_id: string;
  source: Order["source"];
  status: string;
  payment_status: "unpaid";
  fulfillment_method_id: string;
  fulfillment_method_label: string;
  fulfillment_fee_cents: number;
  fulfillment_address: CustomerAddress | null;
  requested_at: string | null;
  requested_time_window: string;
  gift_message: string;
  customer_notes: string;
  payment_method_id: string;
  payment_method_label: string;
  payment_reference: string;
  subtotal_cents: number;
  discount_cents: number;
  tax_cents: number;
  total_cents: number;
  status_token: string;
  idempotency_key: string;
  created_by: string | null;
}

export interface NewOrderItemRecord {
  product_id: string;
  product_name: string;
  unit_price_cents: number;
  quantity: number;
  selected_options: SelectedOption[];
  line_total_cents: number;
  prep_notes: string;
  sort_order: number;
}

export interface CreateOrderContext {
  taxRateBps: number;
  fulfillmentMethods: FulfillmentMethod[];
  paymentMethods: PaymentMethod[];
  source?: Order["source"];
  createdBy?: string | null;
}

export interface ResolvedLine {
  productId: string;
  productName: string;
  unitPriceCents: number;
  quantity: number;
  selectedOptions: SelectedOption[];
  lineTotalCents: number;
  prepNotes: string;
  isTracked: boolean;
}

export function resolveLineItem(
  product: ProductWithRelations,
  quantity: number,
  selectedOptionIds: string[],
  prepNotes: string
): ResolvedLine {
  if (!product.is_active || product.is_archived) {
    throw new OrderValidationError(`"${product.name}" is no longer available.`);
  }
  if (product.is_sold_out) {
    throw new OrderValidationError(`"${product.name}" is sold out.`);
  }
  if (quantity < product.min_quantity) {
    throw new OrderValidationError(
      `"${product.name}" requires a minimum quantity of ${product.min_quantity}.`
    );
  }
  if (product.max_quantity != null && quantity > product.max_quantity) {
    throw new OrderValidationError(
      `"${product.name}" allows a maximum quantity of ${product.max_quantity}.`
    );
  }
  if (product.inventory_mode === "tracked" && product.inventory_count < quantity) {
    throw new OrderValidationError(`"${product.name}" doesn't have enough stock left.`);
  }

  const selectedSet = new Set(selectedOptionIds);
  const selectedOptions: SelectedOption[] = [];

  for (const group of product.product_variant_groups) {
    const chosen = group.product_variant_options.filter((o) => selectedSet.has(o.id));

    if (group.is_required && chosen.length === 0) {
      throw new OrderValidationError(`Please choose a ${group.name.toLowerCase()} for "${product.name}".`);
    }
    if (group.selection_type === "single" && chosen.length > 1) {
      throw new OrderValidationError(`Only one ${group.name.toLowerCase()} may be selected for "${product.name}".`);
    }
    for (const option of chosen) {
      if (!option.is_active || option.is_sold_out) {
        throw new OrderValidationError(`"${option.name}" is no longer available for "${product.name}".`);
      }
      selectedOptions.push({
        group_name: group.name,
        option_name: option.name,
        price_delta_cents: option.price_delta_cents,
      });
    }
  }

  const optionDeltasCents = selectedOptions.map((o) => o.price_delta_cents);
  const lineTotalCents = computeLineTotalCents({
    unitPriceCents: product.price_cents,
    quantity,
    optionDeltasCents,
  });

  return {
    productId: product.id,
    productName: product.name,
    unitPriceCents: product.price_cents,
    quantity,
    selectedOptions,
    lineTotalCents,
    prepNotes,
    isTracked: product.inventory_mode === "tracked",
  };
}

export interface CreateOrderResult {
  order: Order;
  items: OrderItem[];
  created: boolean;
}

export async function createOrder(
  repo: OrderRepo,
  ctx: CreateOrderContext,
  input: CheckoutInput
): Promise<CreateOrderResult> {
  const existing = await repo.findOrderByIdempotencyKey(input.idempotencyKey);
  if (existing) {
    return { order: existing, items: [], created: false };
  }

  const fulfillmentMethod = ctx.fulfillmentMethods.find((m) => m.id === input.fulfillmentMethodId);
  if (!fulfillmentMethod || !fulfillmentMethod.is_active) {
    throw new OrderValidationError("Please choose a valid fulfillment method.");
  }
  if (fulfillmentMethod.requires_address && !input.address?.line1) {
    throw new OrderValidationError("An address is required for this fulfillment method.");
  }
  if (fulfillmentMethod.requires_date && !input.requestedAt) {
    throw new OrderValidationError("Please choose a requested date.");
  }

  const paymentMethod = ctx.paymentMethods.find((m) => m.id === input.paymentMethodId);
  if (!paymentMethod || !paymentMethod.is_active) {
    throw new OrderValidationError("Please choose a valid payment method.");
  }

  const uniqueProductIds = [...new Set(input.items.map((i) => i.productId))];
  const products = await repo.getProductsByIds(uniqueProductIds);
  const productById = new Map(products.map((p) => [p.id, p]));

  const resolvedLines = input.items.map((item) => {
    const product = productById.get(item.productId);
    if (!product) {
      throw new OrderValidationError("One of the items in your cart is no longer available.");
    }
    return resolveLineItem(product, item.quantity, item.selectedOptionIds, item.prepNotes ?? "");
  });

  const totals = calculateOrderTotals({
    lines: resolvedLines.map((l) => ({
      unitPriceCents: l.unitPriceCents,
      quantity: l.quantity,
      optionDeltasCents: l.selectedOptions.map((o) => o.price_delta_cents),
    })),
    taxRateBps: ctx.taxRateBps,
    fulfillmentFeeCents: fulfillmentMethod.fee_cents,
  });

  const phoneNormalized = normalizePhone(input.phone);
  const emailNormalized = input.email ? normalizeEmail(input.email) : null;

  let customer = await repo.findCustomerByNormalized(phoneNormalized, emailNormalized);
  customer = await repo.upsertCustomer({
    id: customer?.id,
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
    phoneNormalized,
    email: input.email || null,
    emailNormalized,
    address: input.address?.line1 ? (input.address as CustomerAddress) : undefined,
  });

  const order = await repo.insertOrder({
    customer_id: customer.id,
    source: ctx.source ?? "online",
    status: "new",
    payment_status: "unpaid",
    fulfillment_method_id: fulfillmentMethod.id,
    fulfillment_method_label: fulfillmentMethod.label,
    fulfillment_fee_cents: fulfillmentMethod.fee_cents,
    fulfillment_address: input.address?.line1 ? (input.address as CustomerAddress) : null,
    requested_at: input.requestedAt ?? null,
    requested_time_window: input.requestedTimeWindow ?? "",
    gift_message: input.giftMessage ?? "",
    customer_notes: input.orderNotes ?? "",
    payment_method_id: paymentMethod.id,
    payment_method_label: paymentMethod.display_name,
    payment_reference: input.paymentReference ?? "",
    subtotal_cents: totals.subtotalCents,
    discount_cents: totals.discountCents,
    tax_cents: totals.taxCents,
    total_cents: totals.totalCents,
    status_token: generateOrderStatusToken(),
    idempotency_key: input.idempotencyKey,
    created_by: ctx.createdBy ?? null,
  });

  const items = await repo.insertOrderItems(
    order.id,
    resolvedLines.map((line, index) => ({
      product_id: line.productId,
      product_name: line.productName,
      unit_price_cents: line.unitPriceCents,
      quantity: line.quantity,
      selected_options: line.selectedOptions,
      line_total_cents: line.lineTotalCents,
      prep_notes: line.prepNotes,
      sort_order: index,
    }))
  );

  await repo.insertStatusHistory(order.id, "fulfillment", "new");
  await repo.insertStatusHistory(order.id, "payment", "unpaid");

  for (const line of resolvedLines) {
    if (line.isTracked) {
      await repo.applyInventoryDecrement(line.productId, line.quantity, order.id);
    }
  }

  return { order, items, created: true };
}
