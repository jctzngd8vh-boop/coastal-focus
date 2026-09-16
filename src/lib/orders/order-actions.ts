"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { calculateOrderTotals } from "@/lib/orders/totals";
import { applyPayment, applyRefund } from "@/lib/payments/status";
import { generateOrderStatusToken } from "@/lib/tokens";
import type { OrderAdjustment, OrderItem } from "@/types/database";

async function recalcTotals(orderId: string) {
  const supabase = await createSupabaseServerClient();

  const [{ data: order }, { data: items }, { data: adjustments }, { data: settings }] = await Promise.all([
    supabase.from("orders").select("*").eq("id", orderId).single(),
    supabase.from("order_items").select("*").eq("order_id", orderId),
    supabase.from("order_adjustments").select("*").eq("order_id", orderId),
    supabase.from("business_settings").select("tax_rate_bps").eq("id", true).single(),
  ]);
  if (!order) throw new Error("Order not found.");

  const totals = calculateOrderTotals({
    lines: (items as OrderItem[]).map((i) => ({ unitPriceCents: i.line_total_cents / i.quantity, quantity: 1 })),
    adjustments: (adjustments as OrderAdjustment[]).map((a) => ({ amountCents: a.amount_cents })),
    taxRateBps: settings?.tax_rate_bps ?? 0,
    fulfillmentFeeCents: order.fulfillment_fee_cents,
  });

  const { error } = await supabase
    .from("orders")
    .update({
      subtotal_cents: totals.subtotalCents,
      discount_cents: totals.discountCents,
      tax_cents: totals.taxCents,
      total_cents: totals.totalCents,
    })
    .eq("id", orderId);
  if (error) throw new Error(error.message);
}

function revalidateOrder(id: string) {
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

export async function updateOrderStatus(orderId: string, status: string, note = "") {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("orders")
    .update({ status, ...(status === "cancelled" ? { cancelled_at: new Date().toISOString() } : {}) })
    .eq("id", orderId);
  if (error) throw new Error(error.message);

  await supabase.from("order_status_history").insert({
    order_id: orderId,
    status_type: "fulfillment",
    status_value: status,
    note,
    changed_by: user?.id ?? null,
  });

  revalidateOrder(orderId);
}

export async function updatePaymentStatusManually(orderId: string, paymentStatus: string, note = "") {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("orders").update({ payment_status: paymentStatus }).eq("id", orderId);
  if (error) throw new Error(error.message);

  await supabase.from("order_status_history").insert({
    order_id: orderId,
    status_type: "payment",
    status_value: paymentStatus,
    note,
    changed_by: user?.id ?? null,
  });

  revalidateOrder(orderId);
}

const recordPaymentSchema = z.object({
  orderId: z.uuid(),
  amountCents: z.number().int().positive(),
  paymentMethodLabel: z.string().min(1),
  reference: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

export async function recordPayment(input: z.infer<typeof recordPaymentSchema>) {
  const parsed = recordPaymentSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: order } = await supabase.from("orders").select("*").eq("id", parsed.orderId).single();
  if (!order) throw new Error("Order not found.");

  const { amount_paid_cents, payment_status } = applyPayment(order, parsed.amountCents);

  await supabase.from("payments").insert({
    order_id: parsed.orderId,
    amount_cents: parsed.amountCents,
    payment_method_label: parsed.paymentMethodLabel,
    reference: parsed.reference,
    notes: parsed.notes,
    recorded_by: user?.id ?? null,
  });

  const { error } = await supabase
    .from("orders")
    .update({ amount_paid_cents, payment_status })
    .eq("id", parsed.orderId);
  if (error) throw new Error(error.message);

  await supabase.from("order_status_history").insert({
    order_id: parsed.orderId,
    status_type: "payment",
    status_value: payment_status,
    note: `Payment of ${(parsed.amountCents / 100).toFixed(2)} recorded.`,
    changed_by: user?.id ?? null,
  });

  revalidateOrder(parsed.orderId);
}

const recordRefundSchema = z.object({
  orderId: z.uuid(),
  amountCents: z.number().int().positive(),
  reason: z.string().optional().default(""),
});

export async function recordRefund(input: z.infer<typeof recordRefundSchema>) {
  const parsed = recordRefundSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: order } = await supabase.from("orders").select("*").eq("id", parsed.orderId).single();
  if (!order) throw new Error("Order not found.");

  const { amount_refunded_cents, payment_status } = applyRefund(order, parsed.amountCents);

  await supabase.from("refunds").insert({
    order_id: parsed.orderId,
    amount_cents: parsed.amountCents,
    reason: parsed.reason,
    recorded_by: user?.id ?? null,
  });

  const { error } = await supabase
    .from("orders")
    .update({ amount_refunded_cents, payment_status })
    .eq("id", parsed.orderId);
  if (error) throw new Error(error.message);

  await supabase.from("order_status_history").insert({
    order_id: parsed.orderId,
    status_type: "payment",
    status_value: payment_status,
    note: `Refund of ${(parsed.amountCents / 100).toFixed(2)} recorded.`,
    changed_by: user?.id ?? null,
  });

  revalidateOrder(parsed.orderId);
}

export async function addAdjustment(orderId: string, type: "discount" | "custom_charge", label: string, amountCents: number) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const signedAmount = type === "discount" ? -Math.abs(amountCents) : Math.abs(amountCents);

  const { error } = await supabase.from("order_adjustments").insert({
    order_id: orderId,
    adjustment_type: type,
    label,
    amount_cents: signedAmount,
    created_by: user?.id ?? null,
  });
  if (error) throw new Error(error.message);

  await recalcTotals(orderId);
  revalidateOrder(orderId);
}

export async function removeAdjustment(id: string, orderId: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("order_adjustments").delete().eq("id", id);
  if (error) throw new Error(error.message);

  await recalcTotals(orderId);
  revalidateOrder(orderId);
}

export async function updateOrderNotes(orderId: string, field: "internal_notes" | "customer_visible_notes", value: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("orders").update({ [field]: value }).eq("id", orderId);
  if (error) throw new Error(error.message);
  revalidateOrder(orderId);
}

export async function updateItemQuantity(itemId: string, orderId: string, quantity: number) {
  const supabase = await createSupabaseServerClient();
  const { data: item } = await supabase.from("order_items").select("*").eq("id", itemId).single();
  if (!item) throw new Error("Item not found.");

  const unitAndOptions = item.line_total_cents / item.quantity;
  const line_total_cents = Math.round(unitAndOptions * quantity);

  const { error } = await supabase.from("order_items").update({ quantity, line_total_cents }).eq("id", itemId);
  if (error) throw new Error(error.message);

  await recalcTotals(orderId);
  revalidateOrder(orderId);
}

export async function removeOrderItem(itemId: string, orderId: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("order_items").delete().eq("id", itemId);
  if (error) throw new Error(error.message);

  await recalcTotals(orderId);
  revalidateOrder(orderId);
}

export async function addOrderItem(orderId: string, productId: string, quantity: number) {
  const supabase = await createSupabaseServerClient();
  const { data: product } = await supabase.from("products").select("*").eq("id", productId).single();
  if (!product) throw new Error("Product not found.");

  const { count } = await supabase
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("order_id", orderId);

  const { error } = await supabase.from("order_items").insert({
    order_id: orderId,
    product_id: product.id,
    product_name: product.name,
    unit_price_cents: product.price_cents,
    quantity,
    selected_options: [],
    line_total_cents: product.price_cents * quantity,
    sort_order: count ?? 0,
  });
  if (error) throw new Error(error.message);

  await recalcTotals(orderId);
  revalidateOrder(orderId);
}

export async function cancelOrder(orderId: string, reason: string) {
  const supabase = await createSupabaseServerClient();

  const { data: items } = await supabase.from("order_items").select("*").eq("order_id", orderId);
  for (const item of (items ?? []) as OrderItem[]) {
    if (!item.product_id) continue;
    const { data: product } = await supabase.from("products").select("*").eq("id", item.product_id).single();
    if (product?.inventory_mode === "tracked") {
      const newCount = product.inventory_count + item.quantity;
      await supabase.from("products").update({ inventory_count: newCount, is_sold_out: false }).eq("id", item.product_id);
      await supabase.from("inventory_movements").insert({
        product_id: item.product_id,
        change_qty: item.quantity,
        reason: "order_cancelled",
        order_id: orderId,
      });
    }
  }

  await updateOrderStatus(orderId, "cancelled", reason || "Order cancelled.");
}

export async function duplicateOrder(orderId: string): Promise<never> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).single();
  if (!order) throw new Error("Order not found.");
  const { data: items } = await supabase.from("order_items").select("*").eq("order_id", orderId);

  const { data: newOrder, error } = await supabase
    .from("orders")
    .insert({
      customer_id: order.customer_id,
      source: "pos",
      status: "new",
      payment_status: "unpaid",
      fulfillment_method_id: order.fulfillment_method_id,
      fulfillment_method_label: order.fulfillment_method_label,
      fulfillment_fee_cents: order.fulfillment_fee_cents,
      fulfillment_address: order.fulfillment_address,
      requested_time_window: order.requested_time_window,
      payment_method_id: order.payment_method_id,
      payment_method_label: order.payment_method_label,
      subtotal_cents: order.subtotal_cents,
      discount_cents: order.discount_cents,
      tax_cents: order.tax_cents,
      total_cents: order.total_cents,
      status_token: generateOrderStatusToken(),
      idempotency_key: crypto.randomUUID(),
      created_by: user?.id ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  if (items && items.length > 0) {
    await supabase.from("order_items").insert(
      (items as OrderItem[]).map((i) => ({
        order_id: newOrder.id,
        product_id: i.product_id,
        product_name: i.product_name,
        unit_price_cents: i.unit_price_cents,
        quantity: i.quantity,
        selected_options: i.selected_options,
        line_total_cents: i.line_total_cents,
        prep_notes: i.prep_notes,
        sort_order: i.sort_order,
      }))
    );
  }

  await supabase.from("order_status_history").insert([
    { order_id: newOrder.id, status_type: "fulfillment", status_value: "new", changed_by: user?.id ?? null },
    { order_id: newOrder.id, status_type: "payment", status_value: "unpaid", changed_by: user?.id ?? null },
  ]);

  revalidatePath("/admin/orders");
  redirect(`/admin/orders/${newOrder.id}`);
}
