"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { businessSettingsSchema, type BusinessSettingsInput } from "@/lib/settings/schema";

export async function saveBusinessSettings(
  input: BusinessSettingsInput,
  options: { completeOnboarding?: boolean } = {}
) {
  const parsed = businessSettingsSchema.parse(input);
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const payload: Record<string, unknown> = { ...parsed };
  if (options.completeOnboarding) payload.onboarding_completed = true;

  const { error } = await supabase.from("business_settings").update(payload).eq("id", true);
  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
  revalidatePath("/admin");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/setup");
}
