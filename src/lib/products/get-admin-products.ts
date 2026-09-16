import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProductWithRelations } from "@/types/database";

const PRODUCT_SELECT = `
  *,
  product_images (*),
  product_variant_groups (
    *,
    product_variant_options (*)
  )
`;

export async function getAdminProducts(): Promise<ProductWithRelations[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("products").select(PRODUCT_SELECT).order("sort_order");
  return (data ?? []) as unknown as ProductWithRelations[];
}

export async function getAdminProduct(id: string): Promise<ProductWithRelations | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("products").select(PRODUCT_SELECT).eq("id", id).maybeSingle();
  return (data as unknown as ProductWithRelations) ?? null;
}
