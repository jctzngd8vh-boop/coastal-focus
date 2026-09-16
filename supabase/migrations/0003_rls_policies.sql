-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Design:
--  * Public (anon) users get read-only access to storefront catalog data
--    (active products, active payment/fulfillment methods, business settings,
--    order stage labels) so the storefront can render with the anon key.
--  * Everything customer/order related (customers, orders, payments, etc.)
--    has NO anon policies at all. Public order creation and the secure
--    order-status lookup are handled by server-only routes using the
--    Supabase service role key, which bypasses RLS. This guarantees prices
--    and totals are always computed server-side, never trusted from the
--    browser.
--  * Authenticated owner/staff accounts (rows in owner_profiles) get full
--    access to everything via the is_owner() helper.
-- ---------------------------------------------------------------------------

alter table public.owner_profiles enable row level security;
alter table public.business_settings enable row level security;
alter table public.fulfillment_methods enable row level security;
alter table public.payment_methods enable row level security;
alter table public.order_stages enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variant_groups enable row level security;
alter table public.product_variant_options enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_adjustments enable row level security;
alter table public.payments enable row level security;
alter table public.refunds enable row level security;
alter table public.order_fulfillment enable row level security;
alter table public.order_status_history enable row level security;
alter table public.message_templates enable row level security;
alter table public.notification_logs enable row level security;
alter table public.inventory_movements enable row level security;

-- owner_profiles ---------------------------------------------------------
create policy owner_profiles_select_own_or_owner on public.owner_profiles
  for select using (id = auth.uid() or public.is_owner());
create policy owner_profiles_insert_owner on public.owner_profiles
  for insert with check (public.is_owner());
create policy owner_profiles_update_owner on public.owner_profiles
  for update using (public.is_owner());
create policy owner_profiles_delete_owner on public.owner_profiles
  for delete using (public.is_owner() and id <> auth.uid());

-- business_settings --------------------------------------------------------
create policy business_settings_public_read on public.business_settings
  for select using (true);
create policy business_settings_owner_write on public.business_settings
  for all using (public.is_owner()) with check (public.is_owner());

-- fulfillment_methods --------------------------------------------------------
create policy fulfillment_methods_public_read on public.fulfillment_methods
  for select using (is_active = true or public.is_owner());
create policy fulfillment_methods_owner_write on public.fulfillment_methods
  for all using (public.is_owner()) with check (public.is_owner());

-- payment_methods --------------------------------------------------------
create policy payment_methods_public_read on public.payment_methods
  for select using ((is_active = true and is_customer_selectable = true) or public.is_owner());
create policy payment_methods_owner_write on public.payment_methods
  for all using (public.is_owner()) with check (public.is_owner());

-- order_stages --------------------------------------------------------
create policy order_stages_public_read on public.order_stages
  for select using (true);
create policy order_stages_owner_write on public.order_stages
  for all using (public.is_owner()) with check (public.is_owner());

-- products & related --------------------------------------------------------
create policy products_public_read on public.products
  for select using ((is_active = true and is_archived = false) or public.is_owner());
create policy products_owner_write on public.products
  for all using (public.is_owner()) with check (public.is_owner());

create policy product_images_public_read on public.product_images
  for select using (true);
create policy product_images_owner_write on public.product_images
  for all using (public.is_owner()) with check (public.is_owner());

create policy product_variant_groups_public_read on public.product_variant_groups
  for select using (true);
create policy product_variant_groups_owner_write on public.product_variant_groups
  for all using (public.is_owner()) with check (public.is_owner());

create policy product_variant_options_public_read on public.product_variant_options
  for select using (true);
create policy product_variant_options_owner_write on public.product_variant_options
  for all using (public.is_owner()) with check (public.is_owner());

-- owner-only tables (no anon access; public writes go through service role) --
create policy customers_owner_all on public.customers
  for all using (public.is_owner()) with check (public.is_owner());
create policy orders_owner_all on public.orders
  for all using (public.is_owner()) with check (public.is_owner());
create policy order_items_owner_all on public.order_items
  for all using (public.is_owner()) with check (public.is_owner());
create policy order_adjustments_owner_all on public.order_adjustments
  for all using (public.is_owner()) with check (public.is_owner());
create policy payments_owner_all on public.payments
  for all using (public.is_owner()) with check (public.is_owner());
create policy refunds_owner_all on public.refunds
  for all using (public.is_owner()) with check (public.is_owner());
create policy order_fulfillment_owner_all on public.order_fulfillment
  for all using (public.is_owner()) with check (public.is_owner());
create policy order_status_history_owner_all on public.order_status_history
  for all using (public.is_owner()) with check (public.is_owner());
create policy message_templates_owner_all on public.message_templates
  for all using (public.is_owner()) with check (public.is_owner());
create policy notification_logs_owner_all on public.notification_logs
  for all using (public.is_owner()) with check (public.is_owner());
create policy inventory_movements_owner_all on public.inventory_movements
  for all using (public.is_owner()) with check (public.is_owner());
