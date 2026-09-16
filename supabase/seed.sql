-- ============================================================================
-- DEMONSTRATION DATA — safe to delete at any time.
--
-- These are sample toffee products so the storefront and POS aren't empty on
-- first run. They are clearly flagged with is_demo = true. Remove them
-- from the owner dashboard (Products → Archive) or by running:
--
--   delete from public.product_variant_options
--     where group_id in (select id from public.product_variant_groups
--       where product_id in (select id from public.products where is_demo = true));
--   delete from public.product_variant_groups
--     where product_id in (select id from public.products where is_demo = true);
--   delete from public.products where is_demo = true;
--
-- Do NOT rely on this data for a live store — the real business name,
-- prices, and policies must be entered through the owner setup wizard.
-- ============================================================================

with p1 as (
  insert into public.products (name, description, price_cents, is_active, min_quantity, prep_notes, allergen_info, sort_order, is_demo)
  values ('Classic Butter Toffee', 'Our original recipe: rich butter toffee hand-poured, snapped into pieces, and enrobed in milk chocolate.', 900, true, 1, 'Made in small batches; allow 24-48 hours notice.', 'Contains milk, may contain traces of tree nuts.', 0, true)
  returning id
),
p1g as (
  insert into public.product_variant_groups (product_id, name, selection_type, is_required, sort_order)
  select id, 'Size', 'single', true, 0 from p1
  returning id
)
insert into public.product_variant_options (group_id, name, price_delta_cents, sort_order)
select id, name, delta, ord from p1g,
  (values ('Half Pound', 0, 0), ('One Pound', 800, 1), ('Two Pounds', 1600, 2)) as sizes(name, delta, ord);

with p2 as (
  insert into public.products (name, description, price_cents, is_active, min_quantity, prep_notes, allergen_info, sort_order, is_demo)
  values ('Sea Salt Toffee', 'Buttery toffee finished with a light hand of flaky sea salt over dark chocolate.', 1000, true, 1, 'Made in small batches; allow 24-48 hours notice.', 'Contains milk, may contain traces of tree nuts.', 1, true)
  returning id
),
p2g as (
  insert into public.product_variant_groups (product_id, name, selection_type, is_required, sort_order)
  select id, 'Size', 'single', true, 0 from p2
  returning id
)
insert into public.product_variant_options (group_id, name, price_delta_cents, sort_order)
select id, name, delta, ord from p2g,
  (values ('Half Pound', 0, 0), ('One Pound', 800, 1), ('Two Pounds', 1600, 2)) as sizes(name, delta, ord);

with p3 as (
  insert into public.products (name, description, price_cents, is_active, min_quantity, prep_notes, allergen_info, sort_order, is_demo)
  values ('Almond Toffee Crunch', 'Toasted almond pieces folded through buttery toffee and coated in milk chocolate.', 1100, true, 1, 'Made in small batches; allow 24-48 hours notice.', 'Contains milk and tree nuts (almonds).', 2, true)
  returning id
),
p3g as (
  insert into public.product_variant_groups (product_id, name, selection_type, is_required, sort_order)
  select id, 'Size', 'single', true, 0 from p3
  returning id
)
insert into public.product_variant_options (group_id, name, price_delta_cents, sort_order)
select id, name, delta, ord from p3g,
  (values ('Half Pound', 0, 0), ('One Pound', 800, 1)) as sizes(name, delta, ord);

with p4 as (
  insert into public.products (name, description, price_cents, is_active, min_quantity, max_quantity, prep_notes, allergen_info, sort_order, is_demo)
  values ('Gift Box Sampler', 'A little of everything — classic, sea salt, and almond toffee in a gift-ready box. Add a gift message at checkout.', 2400, true, 1, 10, 'Please allow extra time around holidays.', 'Contains milk and tree nuts (almonds).', 3, true)
  returning id
)
select 1;
