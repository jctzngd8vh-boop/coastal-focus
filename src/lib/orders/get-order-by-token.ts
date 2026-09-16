import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { Customer, Order, OrderItem } from "@/types/database";

export interface OrderStatusView {
  order: Order;
  items: OrderItem[];
  customer: Customer;
}

/**
 * Looks up an order by its unguessable status token using the service-role
 * client — this is the one public read path into the orders table, and it
 * only ever matches on the token, never a sequential id.
 */
export async function getOrderByToken(token: string): Promise<OrderStatusView | null> {
  const supabase = createSupabaseServiceClient();

  const { data: order } = await supabase.from("orders").select("*").eq("status_token", token).maybeSingle();
  if (!order) return null;

  const [{ data: items }, { data: customer }] = await Promise.all([
    supabase.from("order_items").select("*").eq("order_id", order.id).order("sort_order"),
    supabase.from("customers").select("*").eq("id", order.customer_id).single(),
  ]);

  return { order: order as Order, items: (items ?? []) as OrderItem[], customer: customer as Customer };
}
