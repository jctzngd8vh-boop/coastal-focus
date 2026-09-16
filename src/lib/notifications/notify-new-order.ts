import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/notifications/email";
import { sendSms } from "@/lib/notifications/sms";
import { formatCents } from "@/lib/orders/totals";
import type { BusinessSettings, Customer, Order, OrderItem } from "@/types/database";

/**
 * Fires all configured notifications for a newly created order and logs the
 * outcome of every attempt. The order has already been saved by the time
 * this runs (see app/api/orders/route.ts) — a notification failure here
 * must never undo or hide the order. Errors are caught per-channel; a
 * failure in one channel never blocks the others.
 */
export async function notifyNewOrder(
  client: SupabaseClient,
  params: {
    settings: BusinessSettings;
    order: Order;
    items: OrderItem[];
    customer: Customer;
  }
): Promise<void> {
  const { settings, order, items, customer } = params;
  const itemLines = items
    .map((i) => `${i.quantity}x ${i.product_name}${i.selected_options.length ? ` (${i.selected_options.map((o) => o.option_name).join(", ")})` : ""}`)
    .join("\n");

  const log = async (
    type: "owner_email" | "owner_sms" | "customer_email",
    recipient: string,
    result: { status: "sent" | "failed" | "skipped"; providerMessageId?: string; errorMessage?: string }
  ) => {
    await client.from("notification_logs").insert({
      order_id: order.id,
      notification_type: type,
      recipient,
      status: result.status,
      error_message: result.errorMessage ?? null,
      provider_message_id: result.providerMessageId ?? null,
    });
  };

  if (settings.notify_owner_email && settings.contact_email) {
    const result = await sendEmail({
      to: settings.contact_email,
      subject: `New order ${order.order_number} — ${formatCents(order.total_cents, settings.currency)}`,
      text: `New order from ${customer.first_name} ${customer.last_name} (${customer.phone}${customer.email ? `, ${customer.email}` : ""})\n\nOrder ${order.order_number}\nFulfillment: ${order.fulfillment_method_label}\n\n${itemLines}\n\nSubtotal: ${formatCents(order.subtotal_cents, settings.currency)}\nDiscount: -${formatCents(order.discount_cents, settings.currency)}\nTax: ${formatCents(order.tax_cents, settings.currency)}\nFulfillment fee: ${formatCents(order.fulfillment_fee_cents, settings.currency)}\nTotal: ${formatCents(order.total_cents, settings.currency)}\nPayment method: ${order.payment_method_label} (Payment Pending until verified)\n\nCustomer notes: ${order.customer_notes || "(none)"}`,
    });
    await log("owner_email", settings.contact_email, result);
  }

  if (settings.notify_owner_sms && settings.sms_phone) {
    const result = await sendSms({
      to: settings.sms_phone,
      body: `New order ${order.order_number}: ${formatCents(order.total_cents, settings.currency)} from ${customer.first_name} ${customer.last_name}. Payment pending.`,
    });
    await log("owner_sms", settings.sms_phone, result);
  }

  if (settings.notify_customer_email && customer.email) {
    const result = await sendEmail({
      to: customer.email,
      subject: `Order received — ${settings.business_name || "your order"} #${order.order_number}`,
      text: `Hi ${customer.first_name}, thanks for your order!\n\nOrder ${order.order_number}\n\n${itemLines}\n\nTotal: ${formatCents(order.total_cents, settings.currency)}\nPayment: ${order.payment_method_label} (Payment Pending)\n\nWe'll let you know as your order moves along. Thanks for choosing ${settings.business_name || "us"}!`,
    });
    await log("customer_email", customer.email, result);
  }
}
