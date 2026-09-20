-- Home page hero slides + section backgrounds (run in Supabase SQL Editor)
-- Public bucket for admin uploads. Safe to re-run.

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
  'home-page',
  'home-page',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg']
)
on conflict (id) do update
set
  public = true,
  file_size_limit = 8388608,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];

drop policy if exists "Public can view home page images" on storage.objects;
drop policy if exists "Admins can upload home page images" on storage.objects;
drop policy if exists "Admins can update home page images" on storage.objects;
drop policy if exists "Admins can delete home page images" on storage.objects;

create policy "Public can view home page images"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'home-page');

create policy "Admins can upload home page images"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'home-page' and public.is_approved_admin());

create policy "Admins can update home page images"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'home-page' and public.is_approved_admin())
  with check (bucket_id = 'home-page' and public.is_approved_admin());

create policy "Admins can delete home page images"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'home-page' and public.is_approved_admin());

notify pgrst, 'reload schema';
