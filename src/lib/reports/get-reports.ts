import { createSupabaseServerClient } from "@/lib/supabase/server";
import { collectedRevenueCents } from "@/lib/payments/status";
import { outstandingBalanceCents } from "@/lib/orders/totals";
import type { Order, OrderItem, PaymentRecord } from "@/types/database";

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
}

export interface ProductRevenueRow {
  productName: string;
  quantitySold: number;
  revenueCents: number;
}

export interface PaymentMethodRevenueRow {
  label: string;
  amountCents: number;
  count: number;
}

export interface ReportData {
  ordersCount: number;
  grossOrderValueCents: number;
  discountsCents: number;
  taxesCents: number;
  fulfillmentFeesCents: number;
  refundsCents: number;
  netCollectedCents: number;
  outstandingBalanceCents: number;
  averageOrderValueCents: number;
  bestSellers: ProductRevenueRow[];
  revenueByProduct: ProductRevenueRow[];
  revenueByPaymentMethod: PaymentMethodRevenueRow[];
  repeatCustomerCount: number;
  totalCustomerCount: number;
}

export async function getReportData(filters: ReportFilters = {}): Promise<ReportData> {
  const supabase = await createSupabaseServerClient();

  let orderQuery = supabase.from("orders").select("*").neq("status", "cancelled");
  if (filters.startDate) orderQuery = orderQuery.gte("created_at", filters.startDate);
  if (filters.endDate) orderQuery = orderQuery.lte("created_at", filters.endDate);

  const { data: orders } = await orderQuery;
  const orderList = (orders ?? []) as Order[];
  const orderIds = orderList.map((o) => o.id);

  const [{ data: items }, { data: payments }, { data: customers }] = await Promise.all([
    orderIds.length ? supabase.from("order_items").select("*").in("order_id", orderIds) : Promise.resolve({ data: [] }),
    orderIds.length ? supabase.from("payments").select("*").in("order_id", orderIds) : Promise.resolve({ data: [] }),
    supabase.from("customers").select("id"),
  ]);

  const itemList = (items ?? []) as OrderItem[];
  const paymentList = (payments ?? []) as PaymentRecord[];

  const productMap = new Map<string, ProductRevenueRow>();
  for (const item of itemList) {
    const row = productMap.get(item.product_name) ?? { productName: item.product_name, quantitySold: 0, revenueCents: 0 };
    row.quantitySold += item.quantity;
    row.revenueCents += item.line_total_cents;
    productMap.set(item.product_name, row);
  }
  const revenueByProduct = [...productMap.values()].sort((a, b) => b.revenueCents - a.revenueCents);

  const methodMap = new Map<string, PaymentMethodRevenueRow>();
  for (const payment of paymentList) {
    const label = payment.payment_method_label || "Unspecified";
    const row = methodMap.get(label) ?? { label, amountCents: 0, count: 0 };
    row.amountCents += payment.amount_cents;
    row.count += 1;
    methodMap.set(label, row);
  }
  const revenueByPaymentMethod = [...methodMap.values()].sort((a, b) => b.amountCents - a.amountCents);

  const ordersByCustomer = new Map<string, number>();
  for (const o of orderList) {
    ordersByCustomer.set(o.customer_id, (ordersByCustomer.get(o.customer_id) ?? 0) + 1);
  }
  const repeatCustomerCount = [...ordersByCustomer.values()].filter((n) => n > 1).length;

  return {
    ordersCount: orderList.length,
    grossOrderValueCents: orderList.reduce((s, o) => s + o.total_cents, 0),
    discountsCents: orderList.reduce((s, o) => s + o.discount_cents, 0),
    taxesCents: orderList.reduce((s, o) => s + o.tax_cents, 0),
    fulfillmentFeesCents: orderList.reduce((s, o) => s + o.fulfillment_fee_cents, 0),
    refundsCents: orderList.reduce((s, o) => s + o.amount_refunded_cents, 0),
    netCollectedCents: orderList.reduce((s, o) => s + collectedRevenueCents(o), 0),
    outstandingBalanceCents: orderList.reduce((s, o) => s + outstandingBalanceCents(o), 0),
    averageOrderValueCents: orderList.length ? Math.round(orderList.reduce((s, o) => s + o.total_cents, 0) / orderList.length) : 0,
    bestSellers: revenueByProduct.slice(0, 5),
    revenueByProduct,
    revenueByPaymentMethod,
    repeatCustomerCount,
    totalCustomerCount: (customers ?? []).length,
  };
}
