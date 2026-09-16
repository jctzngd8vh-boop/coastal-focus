import { createSupabaseServerClient } from "@/lib/supabase/server";
import { collectedRevenueCents } from "@/lib/payments/status";
import type { Customer, Order } from "@/types/database";

export interface CustomerWithStats extends Customer {
  totalOrders: number;
  totalRevenueCents: number;
  lastOrderAt: string | null;
}

export async function getAdminCustomers(search?: string): Promise<CustomerWithStats[]> {
  const supabase = await createSupabaseServerClient();
  const [{ data: customers }, { data: orders }] = await Promise.all([
    supabase.from("customers").select("*").order("created_at", { ascending: false }),
    supabase.from("orders").select("customer_id, total_cents, amount_paid_cents, amount_refunded_cents, created_at"),
  ]);

  const ordersByCustomer = new Map<string, Pick<Order, "total_cents" | "amount_paid_cents" | "amount_refunded_cents" | "created_at">[]>();
  for (const o of orders ?? []) {
    const list = ordersByCustomer.get(o.customer_id) ?? [];
    list.push(o);
    ordersByCustomer.set(o.customer_id, list);
  }

  let rows: CustomerWithStats[] = (customers ?? []).map((c) => {
    const custOrders = ordersByCustomer.get(c.id) ?? [];
    return {
      ...c,
      totalOrders: custOrders.length,
      totalRevenueCents: custOrders.reduce((sum, o) => sum + collectedRevenueCents(o), 0),
      lastOrderAt: custOrders.length
        ? custOrders.reduce((latest, o) => (o.created_at > latest ? o.created_at : latest), custOrders[0].created_at)
        : null,
    };
  });

  if (search) {
    const term = search.trim().toLowerCase();
    rows = rows.filter((c) =>
      [c.first_name, c.last_name, c.phone, c.email].filter(Boolean).join(" ").toLowerCase().includes(term)
    );
  }

  return rows;
}

export interface CustomerDetail {
  customer: Customer;
  orders: Order[];
}

export async function getAdminCustomerDetail(id: string): Promise<CustomerDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data: customer } = await supabase.from("customers").select("*").eq("id", id).maybeSingle();
  if (!customer) return null;

  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("customer_id", id)
    .order("created_at", { ascending: false });

  return { customer: customer as Customer, orders: (orders ?? []) as Order[] };
}
