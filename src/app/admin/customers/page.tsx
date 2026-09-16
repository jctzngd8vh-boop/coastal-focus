import Link from "next/link";
import { getAdminCustomers } from "@/lib/customers/get-admin-customers";
import { getBusinessSettings } from "@/lib/settings/get-settings";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { CustomerSearchBox } from "@/components/admin/customer-search-box";
import { formatCents } from "@/lib/orders/totals";
import { fullName } from "@/lib/utils";
import { CSV_EXPORT_HREF } from "@/lib/reports/csv";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const [customers, settings] = await Promise.all([getAdminCustomers(q), getBusinessSettings()]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Customers</h1>
        <a href={CSV_EXPORT_HREF.customers} className="text-sm text-muted-foreground underline underline-offset-2">
          Export CSV
        </a>
      </div>
      <CustomerSearchBox />

      {customers.length === 0 ? (
        <EmptyState title="No customers yet" description="Customers appear here after their first order." />
      ) : (
        <div className="flex flex-col gap-2">
          {customers.map((c) => (
            <Link key={c.id} href={`/admin/customers/${c.id}`}>
              <Card className="hover:bg-muted/50">
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-medium">{fullName(c.first_name, c.last_name)}</p>
                    <p className="text-sm text-muted-foreground">
                      {c.phone}
                      {c.email ? ` · ${c.email}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-sm">
                    <p className="font-medium">{formatCents(c.totalRevenueCents, settings.currency)}</p>
                    <p className="text-muted-foreground">{c.totalOrders} orders</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
