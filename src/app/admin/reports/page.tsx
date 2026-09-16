import { getReportData } from "@/lib/reports/get-reports";
import { getBusinessSettings } from "@/lib/settings/get-settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/orders/totals";
import { CSV_EXPORT_HREF } from "@/lib/reports/csv";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const { start, end } = await searchParams;
  const [report, settings] = await Promise.all([
    getReportData({ startDate: start, endDate: end }),
    getBusinessSettings(),
  ]);
  const c = settings.currency;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Reports</h1>
        <a href={CSV_EXPORT_HREF.orders} className="text-sm text-muted-foreground underline underline-offset-2">
          Export Orders CSV
        </a>
      </div>

      <Card>
        <CardContent className="p-4">
          <form className="flex flex-wrap items-end gap-3" method="get">
            <div>
              <Label className="text-xs">From</Label>
              <Input type="date" name="start" defaultValue={start} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input type="date" name="end" defaultValue={end} className="mt-1" />
            </div>
            <Button type="submit" size="sm">
              Apply
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Metric label="Orders" value={String(report.ordersCount)} />
        <Metric label="Gross Order Value" value={formatCents(report.grossOrderValueCents, c)} />
        <Metric label="Net Collected" value={formatCents(report.netCollectedCents, c)} highlight />
        <Metric label="Outstanding Balance" value={formatCents(report.outstandingBalanceCents, c)} />
        <Metric label="Average Order Value" value={formatCents(report.averageOrderValueCents, c)} />
        <Metric label="Repeat Customers" value={`${report.repeatCustomerCount} / ${report.totalCustomerCount}`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Booked vs. Collected</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          <Row label="Discounts given" value={`-${formatCents(report.discountsCents, c)}`} />
          <Row label="Taxes collected" value={formatCents(report.taxesCents, c)} />
          <Row label="Fulfillment fees" value={formatCents(report.fulfillmentFeesCents, c)} />
          <Row label="Refunds issued" value={`-${formatCents(report.refundsCents, c)}`} />
          <p className="mt-2 text-xs text-muted-foreground">
            Only actually-recorded payments count as collected revenue — an order&apos;s total is booked value, not
            guaranteed cash.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Best Sellers</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {report.bestSellers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sales in this range yet.</p>
          ) : (
            report.bestSellers.map((p) => (
              <div key={p.productName} className="flex justify-between text-sm">
                <span>
                  {p.productName} <span className="text-muted-foreground">×{p.quantitySold}</span>
                </span>
                <span>{formatCents(p.revenueCents, c)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue by Payment Method</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {report.revenueByPaymentMethod.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded in this range yet.</p>
          ) : (
            report.revenueByPaymentMethod.map((m) => (
              <div key={m.label} className="flex justify-between text-sm">
                <span>
                  {m.label} <span className="text-muted-foreground">({m.count})</span>
                </span>
                <span>{formatCents(m.amountCents, c)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-success/50 bg-success/5" : undefined}>
      <CardContent className="p-4">
        <p className="text-xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
