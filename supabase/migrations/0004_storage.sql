-- Public media bucket for product photos, the business logo, and payment QR
-- codes. Publicly readable (so images render on the storefront without
-- signed URLs); only owners/staff can upload, replace, or delete.

insert into storage.buckets (id, name, public)
values ('public-media', 'public-media', true)
on conflict (id) do nothing;

create policy "public_media_public_read"
  on storage.objects for select
  using (bucket_id = 'public-media');

create policy "public_media_owner_insert"
  on storage.objects for insert
  with check (bucket_id = 'public-media' and public.is_owner());

create policy "public_media_owner_update"
  on storage.objects for update
  using (bucket_id = 'public-media' and public.is_owner())
  with check (bucket_id = 'public-media' and public.is_owner());

create policy "public_media_owner_delete"
  on storage.objects for delete
  using (bucket_id = 'public-media' and public.is_owner());
