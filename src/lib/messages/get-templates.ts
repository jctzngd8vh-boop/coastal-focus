import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MessageTemplate } from "@/types/database";

export async function getMessageTemplates(): Promise<MessageTemplate[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("message_templates").select("*").order("sort_order");
  return (data ?? []) as MessageTemplate[];
}
