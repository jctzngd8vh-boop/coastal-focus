"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notifyNewOrder } from "@/lib/notifications/notify-new-order";
import type { BusinessSettings, Customer, Order, OrderItem } from "@/types/database";

/** Lets the owner manually (re-)trigger the new-order notifications for an order — e.g. to test Resend/Twilio setup. */
export async function resendOrderNotifications(orderId: string) {
  const supabase = await createSupabaseServerClient();

  const [{ data: order }, { data: settings }] = await Promise.all([
    supabase.from("orders").select("*").eq("id", orderId).single(),
    supabase.from("business_settings").select("*").eq("id", true).single(),
  ]);
  if (!order) throw new Error("Order not found.");

  const [{ data: items }, { data: customer }] = await Promise.all([
    supabase.from("order_items").select("*").eq("order_id", orderId),
    supabase.from("customers").select("*").eq("id", order.customer_id).single(),
  ]);

  await notifyNewOrder(supabase, {
    settings: settings as BusinessSettings,
    order: order as Order,
    items: (items ?? []) as OrderItem[],
    customer: customer as Customer,
  });
}
