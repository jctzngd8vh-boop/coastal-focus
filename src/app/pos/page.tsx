import { getStorefrontProducts, getActiveFulfillmentMethods } from "@/lib/catalog/get-catalog";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getBusinessSettings } from "@/lib/settings/get-settings";
import { getMessageTemplates } from "@/lib/messages/get-templates";
import { PosOrderForm } from "@/components/pos/pos-order-form";
import type { PaymentMethod } from "@/types/database";

export default async function PosPage() {
  const supabase = await createSupabaseServerClient();
  const [products, fulfillmentMethods, { data: paymentMethods }, settings, templates] = await Promise.all([
    getStorefrontProducts(),
    getActiveFulfillmentMethods(),
    supabase.from("payment_methods").select("*").eq("is_active", true).order("sort_order"),
    getBusinessSettings(),
    getMessageTemplates(),
  ]);

  return (
    <PosOrderForm
      products={products}
      fulfillmentMethods={fulfillmentMethods}
      paymentMethods={(paymentMethods ?? []) as PaymentMethod[]}
      settings={settings}
      templates={templates}
    />
  );
}
