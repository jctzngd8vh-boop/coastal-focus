"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const paymentMethodSchema = z.object({
  id: z.uuid().optional(),
  key: z.string().trim().min(1).max(60),
  display_name: z.string().trim().min(1).max(120),
  method_type: z.enum(["cashapp", "venmo", "paypal", "zelle", "apple_pay", "cash", "custom"]),
  handle: z.string().max(200).optional().default(""),
  instructions: z.string().max(1000).optional().default(""),
  external_url: z.union([z.string().url(), z.literal("")]).default(""),
  qr_code_url: z.string().url().nullable().default(null),
  is_active: z.boolean().default(true),
  is_customer_selectable: z.boolean().default(true),
  is_pos_only: z.boolean().default(false),
  sort_order: z.number().int().default(0),
});

export type PaymentMethodInput = z.infer<typeof paymentMethodSchema>;

export async function upsertPaymentMethod(input: PaymentMethodInput) {
  const parsed = paymentMethodSchema.parse(input);
  const supabase = await createSupabaseServerClient();

  const payload = { ...parsed, external_url: parsed.external_url || null };

  const { error } = parsed.id
    ? await supabase.from("payment_methods").update(payload).eq("id", parsed.id)
    : await supabase.from("payment_methods").insert(payload);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/settings");
  revalidatePath("/checkout");
}

export async function deletePaymentMethod(id: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("payment_methods").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/settings");
  revalidatePath("/checkout");
}
