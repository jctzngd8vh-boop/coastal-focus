import { createSupabaseServerClient } from "@/lib/supabase/server";
import { collectedRevenueCents } from "@/lib/payments/status";
import type { Customer, Order, OrderStage, Product } from "@/types/database";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfWeek(d: Date) {
  const x = startOfDay(d);
  x.setDate(x.getDate() - x.getDay());
  return x;
}
function startOfMonth(d: Date) {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

export interface DashboardStats {
  newOrdersCount: number;
  needsAttentionCount: number;
  todayOrdersCount: number;
  upcomingOrdersCount: number;
  unpaidOrdersCount: number;
  ordersByStage: { stage: OrderStage; count: number }[];
  todayRevenueCents: number;
  weekRevenueCents: number;
  monthRevenueCents: number;
  averageOrderValueCents: number;
  totalOrdersCount: number;
  recentCustomers: Customer[];
  lowStockProducts: Product[];
  recentOrders: (Order & { customer: Customer })[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createSupabaseServerClient();
  const now = new Date();

  const [{ data: orders }, { data: stages }, { data: customers }, { data: products }] = await Promise.all([
    supabase.from("orders").select("*, customer:customers(*)").order("created_at", { ascending: false }),
    supabase.from("order_stages").select("*").order("sort_order"),
    supabase.from("customers").select("*").order("created_at", { ascending: false }).limit(5),
    supabase.from("products").select("*").eq("inventory_mode", "tracked"),
  ]);

  const allOrders = (orders ?? []) as unknown as (Order & { customer: Customer })[];
  const stageList = (stages ?? []) as OrderStage[];

  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  const todayOrders = allOrders.filter((o) => new Date(o.created_at) >= todayStart);
  const weekOrders = allOrders.filter((o) => new Date(o.created_at) >= weekStart);
  const monthOrders = allOrders.filter((o) => new Date(o.created_at) >= monthStart);

  const sumCollected = (rows: Order[]) => rows.reduce((sum, o) => sum + collectedRevenueCents(o), 0);

  const ordersByStage = stageList.map((stage) => ({
    stage,
    count: allOrders.filter((o) => o.status === stage.key).length,
  }));

  const activeOrders = allOrders.filter((o) => o.status !== "cancelled" && o.status !== "completed");

  return {
    newOrdersCount: allOrders.filter((o) => o.status === "new").length,
    needsAttentionCount: allOrders.filter((o) => o.status !== "cancelled" && o.payment_status === "unpaid").length,
    todayOrdersCount: todayOrders.length,
    upcomingOrdersCount: allOrders.filter((o) => o.requested_at && new Date(o.requested_at) > now && o.status !== "cancelled")
      .length,
    unpaidOrdersCount: activeOrders.filter((o) => o.payment_status === "unpaid" || o.payment_status === "pending_verification").length,
    ordersByStage,
    todayRevenueCents: sumCollected(todayOrders),
    weekRevenueCents: sumCollected(weekOrders),
    monthRevenueCents: sumCollected(monthOrders),
    averageOrderValueCents: allOrders.length
      ? Math.round(allOrders.reduce((s, o) => s + o.total_cents, 0) / allOrders.length)
      : 0,
    totalOrdersCount: allOrders.length,
    recentCustomers: (customers ?? []) as Customer[],
    lowStockProducts: ((products ?? []) as Product[]).filter((p) => p.inventory_count <= 5),
    recentOrders: allOrders.slice(0, 8),
  };
}
