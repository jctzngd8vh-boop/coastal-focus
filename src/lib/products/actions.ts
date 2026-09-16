"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const productSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1, "Name is required.").max(200),
  description: z.string().max(2000).optional().default(""),
  price_cents: z.number().int().min(0),
  is_active: z.boolean(),
  is_archived: z.boolean(),
  inventory_mode: z.enum(["unlimited", "tracked"]),
  inventory_count: z.number().int().min(0),
  is_sold_out: z.boolean(),
  min_quantity: z.number().int().min(1),
  max_quantity: z.number().int().min(1).nullable(),
  prep_notes: z.string().max(1000).optional().default(""),
  allergen_info: z.string().max(1000).optional().default(""),
  sort_order: z.number().int(),
});

export type ProductInput = z.infer<typeof productSchema>;

export async function createDraftProduct(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase.from("products").select("id", { count: "exact", head: true });

  const { data, error } = await supabase
    .from("products")
    .insert({ name: "New Product", is_active: false, sort_order: count ?? 0 })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/admin/products");
  redirect(`/admin/products/${data.id}`);
}

export async function updateProduct(input: ProductInput) {
  const parsed = productSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const { id, ...payload } = parsed;

  const { error } = await supabase.from("products").update(payload).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
  revalidatePath("/");
}

export async function setProductArchived(id: string, archived: boolean) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("products")
    .update({ is_archived: archived, is_active: archived ? false : true })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/products");
  revalidatePath("/");
}

export async function deleteProduct(id: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/products");
  revalidatePath("/");
}

export async function addProductImage(productId: string, url: string) {
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from("product_images")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);
  const { error } = await supabase
    .from("product_images")
    .insert({ product_id: productId, url, sort_order: count ?? 0 });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/");
}

export async function deleteProductImage(id: string, productId: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("product_images").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/");
}

const variantGroupSchema = z.object({
  id: z.uuid().optional(),
  product_id: z.uuid(),
  name: z.string().trim().min(1).max(80),
  selection_type: z.enum(["single", "multiple"]),
  is_required: z.boolean(),
  sort_order: z.number().int().default(0),
});

export async function upsertVariantGroup(input: z.infer<typeof variantGroupSchema>) {
  const parsed = variantGroupSchema.parse(input);
  const supabase = await createSupabaseServerClient();

  const { error } = parsed.id
    ? await supabase.from("product_variant_groups").update(parsed).eq("id", parsed.id)
    : await supabase.from("product_variant_groups").insert(parsed);

  if (error) throw new Error(error.message);
  revalidatePath(`/admin/products/${parsed.product_id}`);
  revalidatePath("/");
}

export async function deleteVariantGroup(id: string, productId: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("product_variant_groups").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/");
}

const variantOptionSchema = z.object({
  id: z.uuid().optional(),
  group_id: z.uuid(),
  product_id: z.uuid(),
  name: z.string().trim().min(1).max(80),
  price_delta_cents: z.number().int(),
  is_active: z.boolean(),
  is_sold_out: z.boolean(),
  sort_order: z.number().int().default(0),
});

export async function upsertVariantOption(input: z.infer<typeof variantOptionSchema>) {
  const parsed = variantOptionSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const { product_id, ...payload } = parsed;

  const { error } = parsed.id
    ? await supabase.from("product_variant_options").update(payload).eq("id", parsed.id)
    : await supabase.from("product_variant_options").insert(payload);

  if (error) throw new Error(error.message);
  revalidatePath(`/admin/products/${product_id}`);
  revalidatePath("/");
}

export async function deleteVariantOption(id: string, productId: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("product_variant_options").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/");
}
