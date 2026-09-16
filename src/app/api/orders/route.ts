import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createSupabaseOrderRepo } from "@/lib/orders/supabase-order-repo";
import { createOrder, OrderValidationError } from "@/lib/orders/create-order";
import { buildCheckoutSchema } from "@/lib/orders/schema";
import { checkRateLimit } from "@/lib/rate-limit";
import { notifyNewOrder } from "@/lib/notifications/notify-new-order";
import { isServiceRoleConfigured } from "@/lib/env";
import type { BusinessSettings, Customer, FulfillmentMethod, PaymentMethod } from "@/types/database";

export const dynamic = "force-dynamic";

/**
 * Public, unauthenticated endpoint used by the storefront checkout flow.
 * Anyone can call this, so:
 *  - it is rate-limited per IP,
 *  - all pricing is recomputed server-side from the database (see createOrder),
 *  - the service-role client is used only here and in the status lookup route,
 *  - the order is always saved before any notification is attempted, and a
 *    notification failure never rolls back or hides the order.
 */
export async function POST(request: NextRequest) {
  if (!isServiceRoleConfigured()) {
    return NextResponse.json(
      { error: "This store isn't fully configured yet. See SETUP.md for the Supabase service role key." },
      { status: 503 }
    );
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rate = checkRateLimit(`create-order:${ip}`);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again in a minute." },
      { status: 429, headers: rate.retryAfterSeconds ? { "Retry-After": String(rate.retryAfterSeconds) } : {} }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();

  const { data: settingsRow } = await supabase.from("business_settings").select("*").eq("id", true).single();
  const settings = settingsRow as BusinessSettings;

  const schema = buildCheckoutSchema(settings?.email_required ?? false);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check your order details.", issues: parsed.error.issues }, { status: 400 });
  }

  const [{ data: fulfillmentMethods }, { data: paymentMethods }] = await Promise.all([
    supabase.from("fulfillment_methods").select("*").eq("is_active", true),
    supabase.from("payment_methods").select("*").eq("is_active", true),
  ]);

  const repo = createSupabaseOrderRepo(supabase);

  try {
    const result = await createOrder(
      repo,
      {
        taxRateBps: settings?.tax_rate_bps ?? 0,
        fulfillmentMethods: (fulfillmentMethods ?? []) as FulfillmentMethod[],
        paymentMethods: (paymentMethods ?? []) as PaymentMethod[],
        source: "online",
      },
      parsed.data
    );

    if (result.created) {
      const { data: customer } = await supabase
        .from("customers")
        .select("*")
        .eq("id", result.order.customer_id)
        .single();

      // Fire-and-forget from the caller's perspective: notification problems
      // are logged, never surfaced as an order-creation failure.
      notifyNewOrder(supabase, {
        settings,
        order: result.order,
        items: result.items,
        customer: customer as Customer,
      }).catch(() => {
        /* already logged per-channel inside notifyNewOrder */
      });
    }

    return NextResponse.json({
      orderNumber: result.order.order_number,
      statusToken: result.order.status_token,
    });
  } catch (error) {
    if (error instanceof OrderValidationError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    console.error("Order creation failed", error);
    return NextResponse.json({ error: "Something went wrong placing your order. Please try again." }, { status: 500 });
  }
}
