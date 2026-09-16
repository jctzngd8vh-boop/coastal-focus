import { notFound } from "next/navigation";
import { getOrderByToken } from "@/lib/orders/get-order-by-token";
import { getOrderStages } from "@/lib/catalog/get-catalog";
import { getBusinessSettings } from "@/lib/settings/get-settings";
import { OrderStatusView } from "@/components/storefront/order-status-view";
import { EmptyState } from "@/components/shared/empty-state";
import { isServiceRoleConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function OrderStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const { token } = await params;
  const { new: isNewParam } = await searchParams;

  if (!isServiceRoleConfigured()) {
    return (
      <EmptyState
        title="Almost there — connect Supabase"
        description="Order status lookups need the Supabase service role key configured (see .env.example and SETUP.md)."
      />
    );
  }

  const [result, stages, settings] = await Promise.all([
    getOrderByToken(token),
    getOrderStages(),
    getBusinessSettings(),
  ]);

  if (!result) notFound();

  return (
    <OrderStatusView
      order={result.order}
      items={result.items}
      customer={result.customer}
      settings={settings}
      stages={stages}
      isNew={isNewParam === "1"}
    />
  );
}
