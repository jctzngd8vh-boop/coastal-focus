import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { FulfillmentMethod, OrderStage, PaymentMethod, ProductWithRelations } from "@/types/database";

const PRODUCT_SELECT = `
  *,
  product_images (*),
  product_variant_groups (
    *,
    product_variant_options (*)
  )
`;

export async function getStorefrontProducts(): Promise<ProductWithRelations[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_active", true)
    .eq("is_archived", false)
    .order("sort_order", { ascending: true });

  return (data ?? []) as unknown as ProductWithRelations[];
}

export async function getActiveFulfillmentMethods(): Promise<FulfillmentMethod[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("fulfillment_methods")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return (data ?? []) as FulfillmentMethod[];
}

export async function getCustomerPaymentMethods(): Promise<PaymentMethod[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("payment_methods")
    .select("*")
    .eq("is_active", true)
    .eq("is_customer_selectable", true)
    .order("sort_order", { ascending: true });
  return (data ?? []) as PaymentMethod[];
}

export async function getOrderStages(): Promise<OrderStage[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("order_stages").select("*").order("sort_order", { ascending: true });
  return (data ?? []) as OrderStage[];
}
