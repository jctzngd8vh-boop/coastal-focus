import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminCustomers } from "@/lib/customers/get-admin-customers";
import { toCsv } from "@/lib/reports/csv";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { data: ownerProfile } = await supabase.from("owner_profiles").select("id").eq("id", user.id).maybeSingle();
  if (!ownerProfile) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const customers = await getAdminCustomers();

  const csv = toCsv(customers, [
    { header: "First Name", value: (c) => c.first_name },
    { header: "Last Name", value: (c) => c.last_name },
    { header: "Phone", value: (c) => c.phone },
    { header: "Email", value: (c) => c.email },
    { header: "Total Orders", value: (c) => c.totalOrders },
    { header: "Total Revenue", value: (c) => (c.totalRevenueCents / 100).toFixed(2) },
    { header: "Last Order", value: (c) => (c.lastOrderAt ? new Date(c.lastOrderAt).toISOString() : "") },
    { header: "Notes", value: (c) => c.notes },
  ]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="customers-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
