import Link from "next/link";
import { getDashboardStats } from "@/lib/reports/get-dashboard-stats";
import { getBusinessSettings } from "@/lib/settings/get-settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderStageBadge, PaymentStatusBadge } from "@/components/shared/status-badge";
import { RealtimeOrdersWatcher } from "@/components/admin/realtime-orders-watcher";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCents } from "@/lib/orders/totals";
import { fullName } from "@/lib/utils";

export default async function DashboardPage() {
  const [stats, settings] = await Promise.all([getDashboardStats(), getBusinessSettings()]);

  return (
    <div className="flex flex-col gap-4">
      <RealtimeOrdersWatcher />
      <h1 className="text-xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="New Orders" value={stats.newOrdersCount} href="/admin/orders?status=new" />
        <StatCard label="Needs Attention" value={stats.needsAttentionCount} href="/admin/orders?payment=unpaid" tone="warning" />
        <StatCard label="Today's Orders" value={stats.todayOrdersCount} />
        <StatCard label="Unpaid Orders" value={stats.unpaidOrdersCount} tone="warning" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <RevenueCard label="Today" cents={stats.todayRevenueCents} currency={settings.currency} />
        <RevenueCard label="This Week" cents={stats.weekRevenueCents} currency={settings.currency} />
        <RevenueCard label="This Month" cents={stats.monthRevenueCents} currency={settings.currency} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Orders by Stage</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {stats.ordersByStage.map(({ stage, count }) => (
            <div key={stage.key} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
              <OrderStageBadge stage={stage} />
              <span className="font-medium">{count}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {stats.recentOrders.length === 0 ? (
            <EmptyState title="No orders yet" description="New orders will show up here as soon as they come in." />
          ) : (
            stats.recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="flex items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-muted"
              >
                <div>
                  <p className="font-medium">
                    {order.order_number} · {fullName(order.customer?.first_name ?? "", order.customer?.last_name ?? "")}
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatCents(order.total_cents, settings.currency)}</span>
                  <PaymentStatusBadge status={order.payment_status} />
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Customers</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {stats.recentCustomers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No customers yet.</p>
            ) : (
              stats.recentCustomers.map((c) => (
                <Link key={c.id} href={`/admin/customers/${c.id}`} className="text-sm hover:underline">
                  {fullName(c.first_name, c.last_name)}
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Low Stock / Sold Out</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {stats.lowStockProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing low on stock.</p>
            ) : (
              stats.lowStockProducts.map((p) => (
                <Link key={p.id} href={`/admin/products/${p.id}`} className="flex justify-between text-sm hover:underline">
                  <span>{p.name}</span>
                  <span className="text-muted-foreground">{p.inventory_count} left</span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-sm text-muted-foreground">
        Average order value: {formatCents(stats.averageOrderValueCents, settings.currency)} across {stats.totalOrdersCount} orders.{" "}
        <Link href="/admin/reports" className="underline underline-offset-2">
          Full reports →
        </Link>
      </p>
    </div>
  );
}

function StatCard({ label, value, href, tone }: { label: string; value: number; href?: string; tone?: "warning" }) {
  const content = (
    <Card className={tone === "warning" && value > 0 ? "border-warning/50 bg-warning/5" : undefined}>
      <CardContent className="p-4">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function RevenueCard({ label, cents, currency }: { label: string; cents: number; currency: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-2xl font-bold">{formatCents(cents, currency)}</p>
        <p className="text-xs text-muted-foreground">{label}&apos;s Revenue (collected)</p>
      </CardContent>
    </Card>
  );
}
