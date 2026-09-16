"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const templateSchema = z.object({
  id: z.uuid().optional(),
  key: z.string().trim().min(1).max(60),
  label: z.string().trim().min(1).max(120),
  channel: z.enum(["sms", "email", "any"]),
  subject: z.string().max(200).default(""),
  body: z.string().max(2000).default(""),
  sort_order: z.number().int().default(0),
});

export type MessageTemplateInput = z.infer<typeof templateSchema>;

export async function upsertMessageTemplate(input: MessageTemplateInput) {
  const parsed = templateSchema.parse(input);
  const supabase = await createSupabaseServerClient();

  const { error } = parsed.id
    ? await supabase.from("message_templates").update(parsed).eq("id", parsed.id)
    : await supabase.from("message_templates").insert({ ...parsed, is_default: false });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/settings");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/customers");
}

export async function deleteMessageTemplate(id: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("message_templates").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/settings");
}
