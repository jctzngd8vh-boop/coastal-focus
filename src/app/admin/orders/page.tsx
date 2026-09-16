import Link from "next/link";
import { getAdminOrders, type OrderFilters } from "@/lib/orders/get-admin-orders";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { OrderStageBadge, PaymentStatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { OrdersFilterBar } from "@/components/admin/orders-filter-bar";
import { formatCents } from "@/lib/orders/totals";
import { fullName } from "@/lib/utils";
import type { OrderStage } from "@/types/database";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; payment?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const filters: OrderFilters = {
    search: params.q,
    status: params.status,
    paymentStatus: params.payment,
    sort: (params.sort as OrderFilters["sort"]) ?? "date_desc",
  };

  const supabase = await createSupabaseServerClient();
  const [orders, { data: stages }] = await Promise.all([
    getAdminOrders(filters),
    supabase.from("order_stages").select("*").order("sort_order"),
  ]);
  const stageList = (stages ?? []) as OrderStage[];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Orders</h1>
      <OrdersFilterBar stages={stageList} />

      {orders.length === 0 ? (
        <EmptyState title="No orders match" description="Try a different search or filter." />
      ) : (
        <div className="flex flex-col gap-2">
          {orders.map((order) => {
            const stage = stageList.find((s) => s.key === order.status);
            return (
              <Link key={order.id} href={`/admin/orders/${order.id}`}>
                <Card className="hover:bg-muted/50">
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{order.order_number}</p>
                        <span className="text-sm text-muted-foreground">
                          {fullName(order.customer?.first_name ?? "", order.customer?.last_name ?? "")}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleString()} · {order.fulfillment_method_label}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="font-medium">{formatCents(order.total_cents)}</span>
                      <div className="flex gap-1">
                        <OrderStageBadge stage={stage} />
                        <PaymentStatusBadge status={order.payment_status} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
