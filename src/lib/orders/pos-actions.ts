"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseOrderRepo } from "@/lib/orders/supabase-order-repo";
import { createOrder } from "@/lib/orders/create-order";
import { applyPayment } from "@/lib/payments/status";
import type { CheckoutInput } from "@/lib/orders/schema";
import type { FulfillmentMethod, PaymentMethod } from "@/types/database";

export interface CreatePosOrderResult {
  orderId: string;
  orderNumber: string;
  statusToken: string;
}

/**
 * The POS flow reuses the exact same order-creation logic (and therefore
 * the exact same server-side pricing and validation) as the public
 * storefront checkout — just with an authenticated owner session instead of
 * the service-role client, and an optional "mark paid now" step for
 * cash-in-hand walk-up sales.
 */
export async function createPosOrder(
  input: CheckoutInput,
  options: { source: "phone" | "text" | "social" | "walk_in" | "pos"; markPaidNow?: boolean }
): Promise<CreatePosOrderResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const [{ data: settings }, { data: fulfillmentMethods }, { data: paymentMethods }] = await Promise.all([
    supabase.from("business_settings").select("tax_rate_bps").eq("id", true).single(),
    supabase.from("fulfillment_methods").select("*").eq("is_active", true),
    supabase.from("payment_methods").select("*").eq("is_active", true),
  ]);

  const repo = createSupabaseOrderRepo(supabase);

  const result = await createOrder(
    repo,
    {
      taxRateBps: settings?.tax_rate_bps ?? 0,
      fulfillmentMethods: (fulfillmentMethods ?? []) as FulfillmentMethod[],
      paymentMethods: (paymentMethods ?? []) as PaymentMethod[],
      source: options.source,
      createdBy: user.id,
    },
    input
  );

  if (options.markPaidNow && result.order.total_cents > 0) {
    const { amount_paid_cents, payment_status } = applyPayment(result.order, result.order.total_cents);
    await supabase.from("payments").insert({
      order_id: result.order.id,
      amount_cents: result.order.total_cents,
      payment_method_label: result.order.payment_method_label,
      recorded_by: user.id,
    });
    await supabase.from("orders").update({ amount_paid_cents, payment_status }).eq("id", result.order.id);
    result.order.amount_paid_cents = amount_paid_cents;
    result.order.payment_status = payment_status;
  }

  revalidatePath("/admin/orders");
  revalidatePath("/admin");

  return { orderId: result.order.id, orderNumber: result.order.order_number, statusToken: result.order.status_token };
}
