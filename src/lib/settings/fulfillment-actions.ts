"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const fulfillmentMethodSchema = z.object({
  id: z.uuid().optional(),
  key: z.string().trim().min(1).max(60),
  label: z.string().trim().min(1).max(120),
  description: z.string().max(500).optional().default(""),
  fee_cents: z.number().int().min(0).default(0),
  requires_address: z.boolean().default(false),
  requires_date: z.boolean().default(false),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});

export type FulfillmentMethodInput = z.infer<typeof fulfillmentMethodSchema>;

export async function upsertFulfillmentMethod(input: FulfillmentMethodInput) {
  const parsed = fulfillmentMethodSchema.parse(input);
  const supabase = await createSupabaseServerClient();

  const { error } = parsed.id
    ? await supabase.from("fulfillment_methods").update(parsed).eq("id", parsed.id)
    : await supabase.from("fulfillment_methods").insert(parsed);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/settings");
  revalidatePath("/checkout");
}

export async function deleteFulfillmentMethod(id: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("fulfillment_methods").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/settings");
  revalidatePath("/checkout");
}
