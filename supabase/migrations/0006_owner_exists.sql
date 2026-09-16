-- Lets the public login page know whether to offer "Create the first owner
-- account" without exposing anything about who that owner is.
create or replace function public.owner_exists()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.owner_profiles);
$$;

grant execute on function public.owner_exists() to anon, authenticated;
