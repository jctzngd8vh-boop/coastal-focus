import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminOrders, type OrderFilters } from "@/lib/orders/get-admin-orders";
import { toCsv } from "@/lib/reports/csv";
import { collectedRevenueCents } from "@/lib/payments/status";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { data: ownerProfile } = await supabase.from("owner_profiles").select("id").eq("id", user.id).maybeSingle();
  if (!ownerProfile) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const url = new URL(request.url);
  const filters: OrderFilters = {
    status: url.searchParams.get("status") ?? undefined,
    paymentStatus: url.searchParams.get("payment") ?? undefined,
  };
  const orders = await getAdminOrders(filters);

  const csv = toCsv(orders, [
    { header: "Order Number", value: (o) => o.order_number },
    { header: "Date", value: (o) => new Date(o.created_at).toISOString() },
    { header: "Customer", value: (o) => `${o.customer?.first_name ?? ""} ${o.customer?.last_name ?? ""}`.trim() },
    { header: "Phone", value: (o) => o.customer?.phone },
    { header: "Email", value: (o) => o.customer?.email },
    { header: "Source", value: (o) => o.source },
    { header: "Status", value: (o) => o.status },
    { header: "Payment Status", value: (o) => o.payment_status },
    { header: "Fulfillment", value: (o) => o.fulfillment_method_label },
    { header: "Subtotal", value: (o) => (o.subtotal_cents / 100).toFixed(2) },
    { header: "Discount", value: (o) => (o.discount_cents / 100).toFixed(2) },
    { header: "Tax", value: (o) => (o.tax_cents / 100).toFixed(2) },
    { header: "Fulfillment Fee", value: (o) => (o.fulfillment_fee_cents / 100).toFixed(2) },
    { header: "Total", value: (o) => (o.total_cents / 100).toFixed(2) },
    { header: "Collected", value: (o) => (collectedRevenueCents(o) / 100).toFixed(2) },
  ]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
