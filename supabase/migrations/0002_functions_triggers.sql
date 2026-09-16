-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'owner_profiles', 'business_settings', 'fulfillment_methods', 'payment_methods',
    'products', 'customers', 'orders', 'message_templates'
  ]
  loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I; create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at();',
      t, t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- is_owner() — used by RLS policies. SECURITY DEFINER avoids RLS recursion.
-- ---------------------------------------------------------------------------
create or replace function public.is_owner()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.owner_profiles where id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- bootstrap_owner() — the very first authenticated user becomes the owner.
-- Safe to call repeatedly; no-ops once an owner exists (unless caller is
-- already an owner, in which case it's a harmless idempotent upsert).
-- ---------------------------------------------------------------------------
create or replace function public.bootstrap_owner(p_full_name text default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_existing_count int;
  v_created boolean := false;
begin
  if v_uid is null then
    return false;
  end if;

  select count(*) into v_existing_count from public.owner_profiles;

  if v_existing_count = 0 then
    insert into public.owner_profiles (id, full_name, role)
    values (v_uid, p_full_name, 'owner')
    on conflict (id) do nothing;
    v_created := true;
  end if;

  return v_created or public.is_owner();
end;
$$;

grant execute on function public.bootstrap_owner(text) to authenticated;
grant execute on function public.is_owner() to authenticated, anon;
