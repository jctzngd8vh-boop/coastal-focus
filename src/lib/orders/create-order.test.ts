import { describe, expect, it, beforeEach } from "vitest";
import { randomUUID } from "crypto";
import { createOrder, OrderValidationError, type OrderRepo } from "./create-order";
import type { CheckoutInput } from "./schema";
import type {
  Customer,
  CustomerAddress,
  FulfillmentMethod,
  Order,
  OrderItem,
  PaymentMethod,
  ProductWithRelations,
} from "@/types/database";

function makeProduct(overrides: Partial<ProductWithRelations> = {}): ProductWithRelations {
  return {
    id: randomUUID(),
    name: "Classic Butter Toffee",
    description: "",
    price_cents: 900,
    is_active: true,
    is_archived: false,
    inventory_mode: "unlimited",
    inventory_count: 0,
    is_sold_out: false,
    min_quantity: 1,
    max_quantity: null,
    prep_notes: "",
    allergen_info: "",
    sort_order: 0,
    is_demo: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    product_images: [],
    product_variant_groups: [],
    ...overrides,
  };
}

function makeFulfillmentMethod(overrides: Partial<FulfillmentMethod> = {}): FulfillmentMethod {
  return {
    id: randomUUID(),
    key: "pickup",
    label: "Local Pickup",
    description: "",
    fee_cents: 0,
    requires_address: false,
    requires_date: false,
    is_active: true,
    sort_order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makePaymentMethod(overrides: Partial<PaymentMethod> = {}): PaymentMethod {
  return {
    id: randomUUID(),
    key: "cash",
    display_name: "Cash at Pickup",
    method_type: "cash",
    handle: "",
    instructions: "",
    external_url: null,
    qr_code_url: null,
    is_active: true,
    is_customer_selectable: true,
    is_pos_only: false,
    sort_order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/** A minimal in-memory OrderRepo so the checkout workflow is tested without a live database. */
class FakeOrderRepo implements OrderRepo {
  products: ProductWithRelations[] = [];
  orders: Order[] = [];
  orderItems: OrderItem[] = [];
  customers: Customer[] = [];
  statusHistory: { orderId: string; type: string; value: string }[] = [];
  inventoryDecrements: { productId: string; quantity: number }[] = [];
  sequence = 0;

  async getProductsByIds(ids: string[]) {
    return this.products.filter((p) => ids.includes(p.id));
  }

  async findOrderByIdempotencyKey(key: string) {
    return this.orders.find((o) => o.idempotency_key === key) ?? null;
  }

  async findCustomerByNormalized(phoneNormalized: string | null, emailNormalized: string | null) {
    return (
      this.customers.find(
        (c) =>
          (phoneNormalized && c.phone_normalized === phoneNormalized) ||
          (emailNormalized && c.email_normalized === emailNormalized)
      ) ?? null
    );
  }

  async upsertCustomer(input: {
    id?: string;
    firstName: string;
    lastName: string;
    phone: string;
    phoneNormalized: string | null;
    email: string | null;
    emailNormalized: string | null;
    address?: CustomerAddress;
  }) {
    const existingIndex = input.id ? this.customers.findIndex((c) => c.id === input.id) : -1;
    const base: Customer = {
      id: input.id ?? randomUUID(),
      first_name: input.firstName,
      last_name: input.lastName,
      phone: input.phone,
      phone_normalized: input.phoneNormalized,
      email: input.email,
      email_normalized: input.emailNormalized,
      address: input.address ?? null,
      notes: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (existingIndex >= 0) {
      this.customers[existingIndex] = { ...this.customers[existingIndex], ...base, id: input.id! };
      return this.customers[existingIndex];
    }
    this.customers.push(base);
    return base;
  }

  async insertOrder(input: Parameters<OrderRepo["insertOrder"]>[0]) {
    this.sequence += 1;
    const order: Order = {
      id: randomUUID(),
      sequence_number: this.sequence,
      order_number: `ORD-${String(this.sequence).padStart(5, "0")}`,
      amount_paid_cents: 0,
      amount_refunded_cents: 0,
      is_complimentary: false,
      customer_visible_notes: "",
      internal_notes: "",
      cancelled_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...input,
    };
    this.orders.push(order);
    return order;
  }

  async insertOrderItems(orderId: string, items: Parameters<OrderRepo["insertOrderItems"]>[1]) {
    const rows = items.map((item) => ({ id: randomUUID(), order_id: orderId, created_at: new Date().toISOString(), ...item }));
    this.orderItems.push(...rows);
    return rows;
  }

  async insertStatusHistory(orderId: string, statusType: "fulfillment" | "payment", statusValue: string) {
    this.statusHistory.push({ orderId, type: statusType, value: statusValue });
  }

  async applyInventoryDecrement(productId: string, quantity: number) {
    this.inventoryDecrements.push({ productId, quantity });
    const product = this.products.find((p) => p.id === productId);
    if (product) product.inventory_count = Math.max(0, product.inventory_count - quantity);
  }
}

function baseCheckoutInput(overrides: Partial<CheckoutInput> = {}): CheckoutInput {
  return {
    items: [],
    firstName: "Jane",
    lastName: "Doe",
    phone: "619-555-0134",
    email: "jane@example.com",
    fulfillmentMethodId: "",
    requestedAt: null,
    requestedTimeWindow: "",
    address: undefined,
    giftMessage: "",
    orderNotes: "",
    paymentMethodId: "",
    paymentReference: "",
    idempotencyKey: randomUUID(),
    ...overrides,
  } as CheckoutInput;
}

describe("createOrder", () => {
  let repo: FakeOrderRepo;
  let product: ProductWithRelations;
  let fulfillment: FulfillmentMethod;
  let payment: PaymentMethod;

  beforeEach(() => {
    repo = new FakeOrderRepo();
    product = makeProduct();
    fulfillment = makeFulfillmentMethod();
    payment = makePaymentMethod();
    repo.products = [product];
  });

  it("creates an order with a server-computed total and a fresh, unguessable status token", async () => {
    const input = baseCheckoutInput({
      items: [{ productId: product.id, quantity: 2, selectedOptionIds: [], prepNotes: "" }],
      fulfillmentMethodId: fulfillment.id,
      paymentMethodId: payment.id,
    });

    const result = await createOrder(
      repo,
      { taxRateBps: 875, fulfillmentMethods: [fulfillment], paymentMethods: [payment] },
      input
    );

    expect(result.created).toBe(true);
    expect(result.order.subtotal_cents).toBe(1800); // 900 * 2
    expect(result.order.tax_cents).toBe(158); // round(1800 * 0.0875)
    expect(result.order.total_cents).toBe(1958);
    expect(result.order.status_token).toHaveLength(32); // 24 bytes, base64url
    expect(result.order.order_number).toMatch(/^ORD-\d{5}$/);
  });

  it("always creates the order as unpaid, regardless of the chosen payment method — never auto-paid", async () => {
    const posOnlyCashApp = makePaymentMethod({ method_type: "cashapp", is_pos_only: false });
    const input = baseCheckoutInput({
      items: [{ productId: product.id, quantity: 1, selectedOptionIds: [], prepNotes: "" }],
      fulfillmentMethodId: fulfillment.id,
      paymentMethodId: posOnlyCashApp.id,
      paymentReference: "opened the CashApp link, said they sent it",
    });

    const result = await createOrder(
      repo,
      { taxRateBps: 0, fulfillmentMethods: [fulfillment], paymentMethods: [posOnlyCashApp] },
      input
    );

    expect(result.order.payment_status).toBe("unpaid");
    expect(result.order.amount_paid_cents).toBe(0);
  });

  it("is idempotent: replaying the same idempotency key returns the original order instead of creating a duplicate", async () => {
    const idempotencyKey = randomUUID();
    const input = baseCheckoutInput({
      items: [{ productId: product.id, quantity: 1, selectedOptionIds: [], prepNotes: "" }],
      fulfillmentMethodId: fulfillment.id,
      paymentMethodId: payment.id,
      idempotencyKey,
    });

    const first = await createOrder(
      repo,
      { taxRateBps: 0, fulfillmentMethods: [fulfillment], paymentMethods: [payment] },
      input
    );
    const second = await createOrder(
      repo,
      { taxRateBps: 0, fulfillmentMethods: [fulfillment], paymentMethods: [payment] },
      input
    );

    expect(second.created).toBe(false);
    expect(second.order.id).toBe(first.order.id);
    expect(repo.orders).toHaveLength(1);
  });

  it("rejects an order for a sold-out product", async () => {
    product.is_sold_out = true;
    const input = baseCheckoutInput({
      items: [{ productId: product.id, quantity: 1, selectedOptionIds: [], prepNotes: "" }],
      fulfillmentMethodId: fulfillment.id,
      paymentMethodId: payment.id,
    });

    await expect(
      createOrder(repo, { taxRateBps: 0, fulfillmentMethods: [fulfillment], paymentMethods: [payment] }, input)
    ).rejects.toThrow(OrderValidationError);
  });

  it("rejects a quantity below the product minimum", async () => {
    product.min_quantity = 3;
    const input = baseCheckoutInput({
      items: [{ productId: product.id, quantity: 1, selectedOptionIds: [], prepNotes: "" }],
      fulfillmentMethodId: fulfillment.id,
      paymentMethodId: payment.id,
    });

    await expect(
      createOrder(repo, { taxRateBps: 0, fulfillmentMethods: [fulfillment], paymentMethods: [payment] }, input)
    ).rejects.toThrow(/minimum quantity/);
  });

  it("requires an address when the fulfillment method requires one", async () => {
    const delivery = makeFulfillmentMethod({ key: "delivery", requires_address: true });
    const input = baseCheckoutInput({
      items: [{ productId: product.id, quantity: 1, selectedOptionIds: [], prepNotes: "" }],
      fulfillmentMethodId: delivery.id,
      paymentMethodId: payment.id,
    });

    await expect(
      createOrder(repo, { taxRateBps: 0, fulfillmentMethods: [delivery], paymentMethods: [payment] }, input)
    ).rejects.toThrow(/address/i);
  });

  it("prices required variant options into the order total", async () => {
    const groupId = randomUUID();
    const optionId = randomUUID();
    product.product_variant_groups = [
      {
        id: groupId,
        product_id: product.id,
        name: "Size",
        selection_type: "single",
        is_required: true,
        sort_order: 0,
        product_variant_options: [
          { id: optionId, group_id: groupId, name: "One Pound", price_delta_cents: 800, is_active: true, is_sold_out: false, sort_order: 0 },
        ],
      },
    ];

    const input = baseCheckoutInput({
      items: [{ productId: product.id, quantity: 1, selectedOptionIds: [optionId], prepNotes: "" }],
      fulfillmentMethodId: fulfillment.id,
      paymentMethodId: payment.id,
    });

    const result = await createOrder(
      repo,
      { taxRateBps: 0, fulfillmentMethods: [fulfillment], paymentMethods: [payment] },
      input
    );

    expect(result.order.subtotal_cents).toBe(900 + 800);
  });

  it("rejects when a required variant group has no selection", async () => {
    const groupId = randomUUID();
    product.product_variant_groups = [
      {
        id: groupId,
        product_id: product.id,
        name: "Flavor",
        selection_type: "single",
        is_required: true,
        sort_order: 0,
        product_variant_options: [
          { id: randomUUID(), group_id: groupId, name: "Original", price_delta_cents: 0, is_active: true, is_sold_out: false, sort_order: 0 },
        ],
      },
    ];

    const input = baseCheckoutInput({
      items: [{ productId: product.id, quantity: 1, selectedOptionIds: [], prepNotes: "" }],
      fulfillmentMethodId: fulfillment.id,
      paymentMethodId: payment.id,
    });

    await expect(
      createOrder(repo, { taxRateBps: 0, fulfillmentMethods: [fulfillment], paymentMethods: [payment] }, input)
    ).rejects.toThrow(/flavor/i);
  });

  it("deduplicates customers by normalized phone across two orders", async () => {
    const inputA = baseCheckoutInput({
      items: [{ productId: product.id, quantity: 1, selectedOptionIds: [], prepNotes: "" }],
      fulfillmentMethodId: fulfillment.id,
      paymentMethodId: payment.id,
      phone: "(619) 555-0134",
      email: "jane@example.com",
    });
    const inputB = baseCheckoutInput({
      items: [{ productId: product.id, quantity: 1, selectedOptionIds: [], prepNotes: "" }],
      fulfillmentMethodId: fulfillment.id,
      paymentMethodId: payment.id,
      phone: "619.555.0134",
      email: "different@example.com",
    });

    const ctx = { taxRateBps: 0, fulfillmentMethods: [fulfillment], paymentMethods: [payment] };
    const first = await createOrder(repo, ctx, inputA);
    const second = await createOrder(repo, ctx, inputB);

    expect(repo.customers).toHaveLength(1);
    expect(second.order.customer_id).toBe(first.order.customer_id);
  });

  it("decrements inventory only for tracked products, and never for unlimited-availability products", async () => {
    const tracked = makeProduct({ inventory_mode: "tracked", inventory_count: 5 });
    repo.products = [tracked, product];

    const input = baseCheckoutInput({
      items: [
        { productId: tracked.id, quantity: 2, selectedOptionIds: [], prepNotes: "" },
        { productId: product.id, quantity: 3, selectedOptionIds: [], prepNotes: "" },
      ],
      fulfillmentMethodId: fulfillment.id,
      paymentMethodId: payment.id,
    });

    await createOrder(repo, { taxRateBps: 0, fulfillmentMethods: [fulfillment], paymentMethods: [payment] }, input);

    expect(repo.inventoryDecrements).toEqual([{ productId: tracked.id, quantity: 2 }]);
  });

  it("records fulfillment and payment status history entries on creation", async () => {
    const input = baseCheckoutInput({
      items: [{ productId: product.id, quantity: 1, selectedOptionIds: [], prepNotes: "" }],
      fulfillmentMethodId: fulfillment.id,
      paymentMethodId: payment.id,
    });

    const result = await createOrder(
      repo,
      { taxRateBps: 0, fulfillmentMethods: [fulfillment], paymentMethods: [payment] },
      input
    );

    expect(repo.statusHistory).toContainEqual({ orderId: result.order.id, type: "fulfillment", value: "new" });
    expect(repo.statusHistory).toContainEqual({ orderId: result.order.id, type: "payment", value: "unpaid" });
  });
});
