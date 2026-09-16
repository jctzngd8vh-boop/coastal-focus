import { z } from "zod";

export const businessHoursEntrySchema = z.object({
  day: z.string(),
  open: z.string(),
  close: z.string(),
  closed: z.boolean(),
});

/**
 * No `.default()` chains here on purpose: this form is always initialized
 * from a fully-populated BusinessSettings row (every column is NOT NULL in
 * the database), so every field is always present. Using plain required
 * types keeps `z.infer` identical to the form's field values and avoids the
 * input/output optionality mismatch `.default()` introduces with
 * @hookform/resolvers' zodResolver typing.
 */
export const businessSettingsSchema = z.object({
  business_name: z.string().trim().min(1, "Business name is required.").max(120),
  description: z.string().max(2000),
  logo_url: z.string().url().nullable(),
  primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex color like #7c3aed."),
  owner_name: z.string().max(120),
  business_phone: z.string().max(30),
  sms_phone: z.string().max(30),
  contact_email: z.union([z.email(), z.literal("")]),
  pickup_address: z.string().max(500),
  pickup_instructions: z.string().max(2000),
  business_hours: z.array(businessHoursEntrySchema),
  order_cutoff_info: z.string().max(500),
  default_turnaround: z.string().max(200),
  tax_rate_bps: z.number().int().min(0).max(10000),
  currency: z.string().length(3),
  customer_policies: z.string().max(4000),
  allergen_notice: z.string().max(2000),
  email_required: z.boolean(),
  notify_owner_email: z.boolean(),
  notify_owner_sms: z.boolean(),
  notify_customer_email: z.boolean(),
});

export type BusinessSettingsInput = z.infer<typeof businessSettingsSchema>;

export const DEFAULT_BUSINESS_HOURS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
].map((day) => ({ day, open: "09:00", close: "17:00", closed: day === "Sunday" }));
