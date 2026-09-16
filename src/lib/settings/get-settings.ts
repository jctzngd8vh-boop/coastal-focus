import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { BusinessSettings } from "@/types/database";

export const DEFAULT_SETTINGS: BusinessSettings = {
  id: true,
  business_name: "",
  description: "",
  logo_url: null,
  primary_color: "#7c3aed",
  owner_name: "",
  business_phone: "",
  sms_phone: "",
  contact_email: "",
  pickup_address: "",
  pickup_instructions: "",
  business_hours: [],
  order_cutoff_info: "",
  default_turnaround: "",
  tax_rate_bps: 0,
  currency: "USD",
  customer_policies: "",
  allergen_notice: "",
  email_required: false,
  notify_owner_email: true,
  notify_owner_sms: false,
  notify_customer_email: true,
  onboarding_completed: false,
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
};

export async function getBusinessSettings(): Promise<BusinessSettings> {
  if (!isSupabaseConfigured()) {
    return DEFAULT_SETTINGS;
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("business_settings").select("*").eq("id", true).maybeSingle();

  return (data as BusinessSettings) ?? DEFAULT_SETTINGS;
}
