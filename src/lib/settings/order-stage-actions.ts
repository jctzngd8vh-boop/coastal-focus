"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const orderStageSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, and underscores only."),
  label: z.string().trim().min(1).max(60),
  sort_order: z.number().int().default(0),
  is_terminal: z.boolean().default(false),
  color: z.enum(["blue", "indigo", "amber", "emerald", "slate", "red"]).default("slate"),
  isNew: z.boolean().optional(),
});

export type OrderStageInput = z.infer<typeof orderStageSchema>;

export async function upsertOrderStage(input: OrderStageInput) {
  const parsed = orderStageSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const { isNew, ...payload } = parsed;

  const { error } = isNew
    ? await supabase.from("order_stages").insert(payload)
    : await supabase.from("order_stages").update(payload).eq("key", payload.key);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/settings");
  revalidatePath("/admin/orders");
}

export async function deleteOrderStage(key: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("order_stages").delete().eq("key", key);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/settings");
  revalidatePath("/admin/orders");
}
