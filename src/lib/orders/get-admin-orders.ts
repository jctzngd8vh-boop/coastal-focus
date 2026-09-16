import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Customer, Order, OrderAdjustment, OrderItem, OrderStatusHistoryEntry, PaymentRecord, RefundRecord } from "@/types/database";

export interface OrderFilters {
  search?: string;
  status?: string;
  paymentStatus?: string;
  fulfillmentMethodId?: string;
  sort?: "date_desc" | "date_asc" | "customer" | "status" | "payment_status" | "total_desc";
}

export interface AdminOrderRow extends Order {
  customer: Customer;
}

export async function getAdminOrders(filters: OrderFilters = {}): Promise<AdminOrderRow[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("orders").select("*, customer:customers(*)");

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.paymentStatus) query = query.eq("payment_status", filters.paymentStatus);
  if (filters.fulfillmentMethodId) query = query.eq("fulfillment_method_id", filters.fulfillmentMethodId);

  switch (filters.sort) {
    case "date_asc":
      query = query.order("created_at", { ascending: true });
      break;
    case "status":
      query = query.order("status", { ascending: true });
      break;
    case "payment_status":
      query = query.order("payment_status", { ascending: true });
      break;
    case "total_desc":
      query = query.order("total_cents", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let rows = (data ?? []) as unknown as AdminOrderRow[];

  if (filters.search) {
    const term = filters.search.trim().toLowerCase();
    rows = rows.filter((o) => {
      const haystack = [
        o.order_number,
        o.customer?.first_name,
        o.customer?.last_name,
        o.customer?.phone,
        o.customer?.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }

  if (filters.sort === "customer") {
    rows = [...rows].sort((a, b) =>
      `${a.customer?.first_name} ${a.customer?.last_name}`.localeCompare(`${b.customer?.first_name} ${b.customer?.last_name}`)
    );
  }

  return rows;
}

export interface AdminOrderDetail {
  order: Order;
  customer: Customer;
  items: OrderItem[];
  adjustments: OrderAdjustment[];
  payments: PaymentRecord[];
  refunds: RefundRecord[];
  statusHistory: OrderStatusHistoryEntry[];
}

export async function getAdminOrderDetail(id: string): Promise<AdminOrderDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data: order } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
  if (!order) return null;

  const [{ data: customer }, { data: items }, { data: adjustments }, { data: payments }, { data: refunds }, { data: statusHistory }] =
    await Promise.all([
      supabase.from("customers").select("*").eq("id", order.customer_id).single(),
      supabase.from("order_items").select("*").eq("order_id", id).order("sort_order"),
      supabase.from("order_adjustments").select("*").eq("order_id", id).order("created_at"),
      supabase.from("payments").select("*").eq("order_id", id).order("recorded_at"),
      supabase.from("refunds").select("*").eq("order_id", id).order("recorded_at"),
      supabase.from("order_status_history").select("*").eq("order_id", id).order("changed_at"),
    ]);

  return {
    order: order as Order,
    customer: customer as Customer,
    items: (items ?? []) as OrderItem[],
    adjustments: (adjustments ?? []) as OrderAdjustment[],
    payments: (payments ?? []) as PaymentRecord[],
    refunds: (refunds ?? []) as RefundRecord[],
    statusHistory: (statusHistory ?? []) as OrderStatusHistoryEntry[],
  };
}
