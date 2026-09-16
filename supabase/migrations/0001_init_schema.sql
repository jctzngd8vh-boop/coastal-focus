-- Coastal Toffee Orders — initial schema
-- All monetary values are stored as integer cents (never floating point).
-- Tax rate is stored in basis points (1/100 of a percent) as an integer.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Owners / staff
-- ---------------------------------------------------------------------------
create table if not exists public.owner_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'owner' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.owner_profiles is 'Business owner / staff accounts allowed into the admin & POS areas. The first row ever inserted bootstraps the account; after that, only an existing owner can add more.';

-- ---------------------------------------------------------------------------
-- Business settings (single row, editable via the owner setup wizard)
-- ---------------------------------------------------------------------------
create table if not exists public.business_settings (
  id boolean primary key default true constraint business_settings_singleton check (id),
  business_name text not null default '',
  description text not null default '',
  logo_url text,
  primary_color text not null default '#7c3aed',
  owner_name text not null default '',
  business_phone text not null default '',
  sms_phone text not null default '',
  contact_email text not null default '',
  pickup_address text not null default '',
  pickup_instructions text not null default '',
  business_hours jsonb not null default '[]'::jsonb,
  order_cutoff_info text not null default '',
  default_turnaround text not null default '',
  tax_rate_bps integer not null default 0 check (tax_rate_bps >= 0 and tax_rate_bps <= 10000),
  currency text not null default 'USD',
  customer_policies text not null default '',
  allergen_notice text not null default '',
  email_required boolean not null default false,
  notify_owner_email boolean not null default true,
  notify_owner_sms boolean not null default false,
  notify_customer_email boolean not null default true,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.business_settings is 'Singleton row (id is always true) holding every owner-configurable business setting.';

-- ---------------------------------------------------------------------------
-- Fulfillment methods (pickup / delivery / shipping / custom)
-- ---------------------------------------------------------------------------
create table if not exists public.fulfillment_methods (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  description text not null default '',
  fee_cents integer not null default 0 check (fee_cents >= 0),
  requires_address boolean not null default false,
  requires_date boolean not null default true,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Payment methods (owner-configurable, external/manual)
-- ---------------------------------------------------------------------------
create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  display_name text not null,
  method_type text not null default 'custom' check (method_type in (
    'cashapp', 'venmo', 'paypal', 'zelle', 'apple_pay', 'cash', 'custom'
  )),
  handle text not null default '',
  instructions text not null default '',
  external_url text,
  qr_code_url text,
  is_active boolean not null default true,
  is_customer_selectable boolean not null default true,
  is_pos_only boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Order stages (configurable fulfillment workflow, sensible defaults seeded)
-- ---------------------------------------------------------------------------
create table if not exists public.order_stages (
  key text primary key,
  label text not null,
  sort_order integer not null default 0,
  is_terminal boolean not null default false,
  color text not null default 'slate'
);

-- ---------------------------------------------------------------------------
-- Products & variants
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  price_cents integer not null default 0 check (price_cents >= 0),
  is_active boolean not null default true,
  is_archived boolean not null default false,
  inventory_mode text not null default 'unlimited' check (inventory_mode in ('unlimited', 'tracked')),
  inventory_count integer not null default 0 check (inventory_count >= 0),
  is_sold_out boolean not null default false,
  min_quantity integer not null default 1 check (min_quantity >= 1),
  max_quantity integer check (max_quantity is null or max_quantity >= 1),
  prep_notes text not null default '',
  allergen_info text not null default '',
  sort_order integer not null default 0,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null,
  alt_text text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.product_variant_groups (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  name text not null,
  selection_type text not null default 'single' check (selection_type in ('single', 'multiple')),
  is_required boolean not null default false,
  sort_order integer not null default 0
);

create table if not exists public.product_variant_options (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.product_variant_groups (id) on delete cascade,
  name text not null,
  price_delta_cents integer not null default 0,
  is_active boolean not null default true,
  is_sold_out boolean not null default false,
  sort_order integer not null default 0
);

-- ---------------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  first_name text not null default '',
  last_name text not null default '',
  phone text not null default '',
  phone_normalized text,
  email text,
  email_normalized text,
  address jsonb,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists customers_phone_normalized_key
  on public.customers (phone_normalized)
  where phone_normalized is not null and phone_normalized <> '';

create unique index if not exists customers_email_normalized_key
  on public.customers (email_normalized)
  where email_normalized is not null and email_normalized <> '';

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  sequence_number bigint generated always as identity,
  order_number text generated always as ('ORD-' || lpad(sequence_number::text, 5, '0')) stored,
  status_token text not null unique,
  customer_id uuid not null references public.customers (id) on delete restrict,
  source text not null default 'online' check (source in (
    'online', 'phone', 'text', 'social', 'walk_in', 'pos'
  )),
  status text not null default 'new' references public.order_stages (key),
  payment_status text not null default 'unpaid' check (payment_status in (
    'unpaid', 'pending_verification', 'partially_paid', 'paid', 'refunded', 'partially_refunded'
  )),
  fulfillment_method_id uuid references public.fulfillment_methods (id) on delete set null,
  fulfillment_method_label text not null default '',
  fulfillment_fee_cents integer not null default 0,
  fulfillment_address jsonb,
  requested_at timestamptz,
  requested_time_window text not null default '',
  gift_message text not null default '',
  customer_notes text not null default '',
  customer_visible_notes text not null default '',
  internal_notes text not null default '',
  payment_method_id uuid references public.payment_methods (id) on delete set null,
  payment_method_label text not null default '',
  payment_reference text not null default '',
  subtotal_cents integer not null default 0,
  discount_cents integer not null default 0,
  tax_cents integer not null default 0,
  total_cents integer not null default 0,
  amount_paid_cents integer not null default 0,
  amount_refunded_cents integer not null default 0,
  is_complimentary boolean not null default false,
  idempotency_key text unique,
  created_by uuid references public.owner_profiles (id) on delete set null,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists orders_order_number_key on public.orders (order_number);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_payment_status_idx on public.orders (payment_status);
create index if not exists orders_customer_id_idx on public.orders (customer_id);
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_requested_at_idx on public.orders (requested_at);
create index if not exists orders_status_token_idx on public.orders (status_token);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  unit_price_cents integer not null default 0,
  quantity integer not null default 1 check (quantity > 0),
  selected_options jsonb not null default '[]'::jsonb,
  line_total_cents integer not null default 0,
  prep_notes text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists order_items_order_id_idx on public.order_items (order_id);

create table if not exists public.order_adjustments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  adjustment_type text not null default 'discount' check (adjustment_type in ('discount', 'custom_charge')),
  label text not null,
  amount_cents integer not null,
  created_by uuid references public.owner_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists order_adjustments_order_id_idx on public.order_adjustments (order_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  payment_method_id uuid references public.payment_methods (id) on delete set null,
  payment_method_label text not null default '',
  reference text not null default '',
  notes text not null default '',
  recorded_by uuid references public.owner_profiles (id) on delete set null,
  recorded_at timestamptz not null default now()
);

create index if not exists payments_order_id_idx on public.payments (order_id);

create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  reason text not null default '',
  recorded_by uuid references public.owner_profiles (id) on delete set null,
  recorded_at timestamptz not null default now()
);

create index if not exists refunds_order_id_idx on public.refunds (order_id);

create table if not exists public.order_fulfillment (
  order_id uuid primary key references public.orders (id) on delete cascade,
  recipient_name text not null default '',
  phone text not null default '',
  address_line1 text not null default '',
  address_line2 text not null default '',
  city text not null default '',
  state text not null default '',
  postal_code text not null default '',
  delivery_notes text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  status_type text not null check (status_type in ('fulfillment', 'payment')),
  status_value text not null,
  note text not null default '',
  changed_by uuid references public.owner_profiles (id) on delete set null,
  changed_at timestamptz not null default now()
);

create index if not exists order_status_history_order_id_idx on public.order_status_history (order_id);

-- ---------------------------------------------------------------------------
-- Messaging & notifications
-- ---------------------------------------------------------------------------
create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  channel text not null default 'sms' check (channel in ('sms', 'email', 'any')),
  subject text not null default '',
  body text not null default '',
  is_default boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders (id) on delete cascade,
  notification_type text not null check (notification_type in (
    'owner_email', 'owner_sms', 'customer_email', 'customer_sms'
  )),
  recipient text not null default '',
  status text not null check (status in ('sent', 'failed', 'skipped')),
  error_message text,
  provider_message_id text,
  created_at timestamptz not null default now()
);

create index if not exists notification_logs_order_id_idx on public.notification_logs (order_id);

-- ---------------------------------------------------------------------------
-- Inventory movements
-- ---------------------------------------------------------------------------
create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  change_qty integer not null,
  reason text not null default 'manual_adjustment' check (reason in (
    'order', 'manual_adjustment', 'restock', 'order_cancelled'
  )),
  order_id uuid references public.orders (id) on delete set null,
  created_by uuid references public.owner_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists inventory_movements_product_id_idx on public.inventory_movements (product_id);
