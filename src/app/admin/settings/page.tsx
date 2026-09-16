import { getBusinessSettings } from "@/lib/settings/get-settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BusinessSettingsForm } from "@/components/admin/business-settings-form";
import { PaymentMethodsManager } from "@/components/admin/payment-methods-manager";
import { FulfillmentMethodsManager } from "@/components/admin/fulfillment-methods-manager";
import { OrderStagesManager } from "@/components/admin/order-stages-manager";
import { MessageTemplatesManager, AddMessageTemplateButton } from "@/components/admin/message-templates-manager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FulfillmentMethod, MessageTemplate, OrderStage, PaymentMethod } from "@/types/database";

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const [settings, { data: paymentMethods }, { data: fulfillmentMethods }, { data: stages }, { data: templates }] = await Promise.all([
    getBusinessSettings(),
    supabase.from("payment_methods").select("*").order("sort_order"),
    supabase.from("fulfillment_methods").select("*").order("sort_order"),
    supabase.from("order_stages").select("*").order("sort_order"),
    supabase.from("message_templates").select("*").order("sort_order"),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Settings</h1>
      <Tabs defaultValue="business">
        <TabsList>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="payment">Payment Methods</TabsTrigger>
          <TabsTrigger value="fulfillment">Fulfillment</TabsTrigger>
          <TabsTrigger value="stages">Order Stages</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
        </TabsList>
        <TabsContent value="business">
          <BusinessSettingsForm settings={settings} mode="settings" />
        </TabsContent>
        <TabsContent value="payment">
          <PaymentMethodsManager methods={(paymentMethods ?? []) as PaymentMethod[]} />
        </TabsContent>
        <TabsContent value="fulfillment">
          <FulfillmentMethodsManager methods={(fulfillmentMethods ?? []) as FulfillmentMethod[]} />
        </TabsContent>
        <TabsContent value="stages">
          <OrderStagesManager stages={(stages ?? []) as OrderStage[]} />
        </TabsContent>
        <TabsContent value="messages">
          <div className="flex flex-col gap-3">
            <MessageTemplatesManager templates={(templates ?? []) as MessageTemplate[]} />
            <AddMessageTemplateButton />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
