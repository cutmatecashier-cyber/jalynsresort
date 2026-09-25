-- Rooms page photos + hero/content backgrounds (run in Supabase SQL Editor)
-- Public bucket for admin room uploads and page backgrounds.
-- Catalog data (rooms, voucher, jeepney highlights) lives in Postgres — run supabase/ROOMS.sql.
-- Object layout:
--   photos/*              — room gallery images
--   highlights/*          — jeepney / shuttle photos
--   hero/current.{ext}    — Rooms hero background (optional)
--   content/current.{ext} — Rooms content background (optional)
-- Safe to re-run.

create or replace function public.is_approved_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.approval_status = 'approved'
  );
$$;

revoke all on function public.is_approved_admin() from public;
grant execute on function public.is_approved_admin() to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'rooms-page',
  'rooms-page',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg']
)
on conflict (id) do update
set
  public = true,
  file_size_limit = 8388608,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];

drop policy if exists "Public can view rooms page images" on storage.objects;
drop policy if exists "Admins can upload rooms page images" on storage.objects;
drop policy if exists "Admins can update rooms page images" on storage.objects;
drop policy if exists "Admins can delete rooms page images" on storage.objects;

create policy "Public can view rooms page images"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'rooms-page');

create policy "Admins can upload rooms page images"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'rooms-page' and public.is_approved_admin());

create policy "Admins can update rooms page images"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'rooms-page' and public.is_approved_admin())
  with check (bucket_id = 'rooms-page' and public.is_approved_admin());

create policy "Admins can delete rooms page images"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'rooms-page' and public.is_approved_admin());

notify pgrst, 'reload schema';
