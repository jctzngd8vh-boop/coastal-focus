import { notFound } from "next/navigation";
import { getAdminOrderDetail } from "@/lib/orders/get-admin-orders";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getBusinessSettings } from "@/lib/settings/get-settings";
import { getMessageTemplates } from "@/lib/messages/get-templates";
import { OrderDetailView } from "@/components/admin/order-detail-view";
import type { OrderStage, Product } from "@/types/database";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getAdminOrderDetail(id);
  if (!detail) notFound();

  const supabase = await createSupabaseServerClient();
  const [{ data: stages }, { data: products }, settings, templates] = await Promise.all([
    supabase.from("order_stages").select("*").order("sort_order"),
    supabase.from("products").select("*").eq("is_archived", false).order("sort_order"),
    getBusinessSettings(),
    getMessageTemplates(),
  ]);

  return (
    <OrderDetailView
      detail={detail}
      stages={(stages ?? []) as OrderStage[]}
      products={(products ?? []) as Product[]}
      settings={settings}
      templates={templates}
    />
  );
}
