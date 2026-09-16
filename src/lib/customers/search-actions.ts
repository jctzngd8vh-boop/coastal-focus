"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Customer } from "@/types/database";

export async function searchCustomers(query: string): Promise<Customer[]> {
  // Strip characters meaningful to PostgREST's filter syntax so a search
  // term can't reshape the `.or()` clause into different conditions.
  const term = query.trim().replace(/[,()*]/g, "");
  if (term.length < 2) return [];

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("customers")
    .select("*")
    .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`)
    .limit(8);

  return (data ?? []) as Customer[];
}
