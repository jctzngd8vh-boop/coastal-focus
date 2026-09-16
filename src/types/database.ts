/**
 * Hand-written types mirroring supabase/migrations/*.sql. Regenerate with
 * `supabase gen types typescript` against a live project when possible;
 * this file keeps the app type-safe without one.
 */

export type OrderSource = "online" | "phone" | "text" | "social" | "walk_in" | "pos";
export type PaymentStatus =
  | "unpaid"
  | "pending_verification"
  | "partially_paid"
  | "paid"
  | "refunded"
  | "partially_refunded";
export type InventoryMode = "unlimited" | "tracked";
export type AdjustmentType = "discount" | "custom_charge";
export type NotificationType = "owner_email" | "owner_sms" | "customer_email" | "customer_sms";
export type NotificationStatus = "sent" | "failed" | "skipped";
export type PaymentMethodType =
  | "cashapp"
  | "venmo"
  | "paypal"
  | "zelle"
  | "apple_pay"
  | "cash"
  | "custom";
export type MessageChannel = "sms" | "email" | "any";
export type StatusHistoryType = "fulfillment" | "payment";

export interface OwnerProfile {
  id: string;
  full_name: string | null;
  role: "owner" | "staff";
  created_at: string;
  updated_at: string;
}

export interface BusinessHoursEntry {
  day: string;
  open: string;
  close: string;
  closed: boolean;
}

export interface BusinessSettings {
  id: true;
  business_name: string;
  description: string;
  logo_url: string | null;
  primary_color: string;
  owner_name: string;
  business_phone: string;
  sms_phone: string;
  contact_email: string;
  pickup_address: string;
  pickup_instructions: string;
  business_hours: BusinessHoursEntry[];
  order_cutoff_info: string;
  default_turnaround: string;
  tax_rate_bps: number;
  currency: string;
  customer_policies: string;
  allergen_notice: string;
  email_required: boolean;
  notify_owner_email: boolean;
  notify_owner_sms: boolean;
  notify_customer_email: boolean;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface FulfillmentMethod {
  id: string;
  key: string;
  label: string;
  description: string;
  fee_cents: number;
  requires_address: boolean;
  requires_date: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethod {
  id: string;
  key: string;
  display_name: string;
  method_type: PaymentMethodType;
  handle: string;
  instructions: string;
  external_url: string | null;
  qr_code_url: string | null;
  is_active: boolean;
  is_customer_selectable: boolean;
  is_pos_only: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type OrderStageColor = "blue" | "indigo" | "amber" | "emerald" | "slate" | "red";

export interface OrderStage {
  key: string;
  label: string;
  sort_order: number;
  is_terminal: boolean;
  color: OrderStageColor;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  is_active: boolean;
  is_archived: boolean;
  inventory_mode: InventoryMode;
  inventory_count: number;
  is_sold_out: boolean;
  min_quantity: number;
  max_quantity: number | null;
  prep_notes: string;
  allergen_info: string;
  sort_order: number;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt_text: string;
  sort_order: number;
  created_at: string;
}

export interface ProductVariantGroup {
  id: string;
  product_id: string;
  name: string;
  selection_type: "single" | "multiple";
  is_required: boolean;
  sort_order: number;
}

export interface ProductVariantOption {
  id: string;
  group_id: string;
  name: string;
  price_delta_cents: number;
  is_active: boolean;
  is_sold_out: boolean;
  sort_order: number;
}

export interface ProductWithRelations extends Product {
  product_images: ProductImage[];
  product_variant_groups: (ProductVariantGroup & { product_variant_options: ProductVariantOption[] })[];
}

export interface CustomerAddress {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
}

export interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  phone_normalized: string | null;
  email: string | null;
  email_normalized: string | null;
  address: CustomerAddress | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface SelectedOption {
  group_name: string;
  option_name: string;
  price_delta_cents: number;
}

export interface Order {
  id: string;
  sequence_number: number;
  order_number: string;
  status_token: string;
  customer_id: string;
  source: OrderSource;
  status: string;
  payment_status: PaymentStatus;
  fulfillment_method_id: string | null;
  fulfillment_method_label: string;
  fulfillment_fee_cents: number;
  fulfillment_address: CustomerAddress | null;
  requested_at: string | null;
  requested_time_window: string;
  gift_message: string;
  customer_notes: string;
  customer_visible_notes: string;
  internal_notes: string;
  payment_method_id: string | null;
  payment_method_label: string;
  payment_reference: string;
  subtotal_cents: number;
  discount_cents: number;
  tax_cents: number;
  total_cents: number;
  amount_paid_cents: number;
  amount_refunded_cents: number;
  is_complimentary: boolean;
  idempotency_key: string | null;
  created_by: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  unit_price_cents: number;
  quantity: number;
  selected_options: SelectedOption[];
  line_total_cents: number;
  prep_notes: string;
  sort_order: number;
  created_at: string;
}

export interface OrderAdjustment {
  id: string;
  order_id: string;
  adjustment_type: AdjustmentType;
  label: string;
  amount_cents: number;
  created_by: string | null;
  created_at: string;
}

export interface PaymentRecord {
  id: string;
  order_id: string;
  amount_cents: number;
  payment_method_id: string | null;
  payment_method_label: string;
  reference: string;
  notes: string;
  recorded_by: string | null;
  recorded_at: string;
}

export interface RefundRecord {
  id: string;
  order_id: string;
  amount_cents: number;
  reason: string;
  recorded_by: string | null;
  recorded_at: string;
}

export interface OrderFulfillmentDetail {
  order_id: string;
  recipient_name: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  delivery_notes: string;
  updated_at: string;
}

export interface OrderStatusHistoryEntry {
  id: string;
  order_id: string;
  status_type: StatusHistoryType;
  status_value: string;
  note: string;
  changed_by: string | null;
  changed_at: string;
}

export interface MessageTemplate {
  id: string;
  key: string;
  label: string;
  channel: MessageChannel;
  subject: string;
  body: string;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface NotificationLog {
  id: string;
  order_id: string | null;
  notification_type: NotificationType;
  recipient: string;
  status: NotificationStatus;
  error_message: string | null;
  provider_message_id: string | null;
  created_at: string;
}

export interface InventoryMovement {
  id: string;
  product_id: string;
  change_qty: number;
  reason: "order" | "manual_adjustment" | "restock" | "order_cancelled";
  order_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface OrderWithRelations extends Order {
  customer: Customer;
  order_items: OrderItem[];
  order_adjustments: OrderAdjustment[];
  payments: PaymentRecord[];
  refunds: RefundRecord[];
}
