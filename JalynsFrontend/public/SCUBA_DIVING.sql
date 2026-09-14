-- Scuba Diving page: rates + PADI courses (run in Supabase SQL Editor)
-- Safe to re-run. Does NOT add extra content tables — only pricing/course data.
-- Hero and gallery images use the public storage bucket `scuba-diving` (not a database table).

-- 1) Admin helper (same definition used by other migrations)
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

-- 2) Diving rates
create table if not exists public.diving_rates (
  id bigint generated always as identity primary key,
  service text not null,
  price text not null
);

-- 3) PADI scuba courses
create table if not exists public.padi_scuba_courses (
  id bigint generated always as identity primary key,
  course text not null,
  details text not null,
  price text not null
);

-- Seed only when empty so re-runs do not duplicate rows
insert into public.diving_rates (service, price)
select *
from (
  values
    ('Single dive with own equipment', '₱1,500'),
    ('10 dives', '₱14,000'),
    ('20 dives', '₱26,000'),
    ('Night Dive additional per dive', '₱800')
) as seed(service, price)
where not exists (select 1 from public.diving_rates);

insert into public.padi_scuba_courses (course, details, price)
select *
from (
  values
    (
      'Discover Scuba Diving',
      '1 pool session & 1 open water dive. Excludes certification.',
      '₱2,800'
    ),
    (
      'Open Water Diver',
      'Includes equipment & certification. 3 days',
      '₱21,000'
    ),
    (
      'Advanced Open Water Diver',
      'Requires Open Water Qualification. Includes Equipment & Manual. 2 days / 5 dives',
      '₱21,000'
    ),
    (
      'Rescue Diver',
      'Available on request',
      'Available on request'
    ),
    (
      'Specialties',
      'Available on request',
      'Available on request'
    )
) as seed(course, details, price)
where not exists (select 1 from public.padi_scuba_courses);

-- 4) RLS
alter table public.diving_rates enable row level security;
alter table public.padi_scuba_courses enable row level security;

drop policy if exists "Anyone can read diving rates" on public.diving_rates;
drop policy if exists "Admins can insert diving rates" on public.diving_rates;
drop policy if exists "Admins can update diving rates" on public.diving_rates;
drop policy if exists "Admins can delete diving rates" on public.diving_rates;

create policy "Anyone can read diving rates"
  on public.diving_rates
  for select
  to anon, authenticated
  using (true);

create policy "Admins can insert diving rates"
  on public.diving_rates
  for insert
  to authenticated
  with check (public.is_approved_admin());

create policy "Admins can update diving rates"
  on public.diving_rates
  for update
  to authenticated
  using (public.is_approved_admin())
  with check (public.is_approved_admin());

create policy "Admins can delete diving rates"
  on public.diving_rates
  for delete
  to authenticated
  using (public.is_approved_admin());

drop policy if exists "Anyone can read padi scuba courses" on public.padi_scuba_courses;
drop policy if exists "Admins can insert padi scuba courses" on public.padi_scuba_courses;
drop policy if exists "Admins can update padi scuba courses" on public.padi_scuba_courses;
drop policy if exists "Admins can delete padi scuba courses" on public.padi_scuba_courses;

create policy "Anyone can read padi scuba courses"
  on public.padi_scuba_courses
  for select
  to anon, authenticated
  using (true);

create policy "Admins can insert padi scuba courses"
  on public.padi_scuba_courses
  for insert
  to authenticated
  with check (public.is_approved_admin());

create policy "Admins can update padi scuba courses"
  on public.padi_scuba_courses
  for update
  to authenticated
  using (public.is_approved_admin())
  with check (public.is_approved_admin());

create policy "Admins can delete padi scuba courses"
  on public.padi_scuba_courses
  for delete
  to authenticated
  using (public.is_approved_admin());

grant select on table public.diving_rates to anon, authenticated;
grant insert, update, delete on table public.diving_rates to authenticated;
grant all on table public.diving_rates to service_role;

grant select on table public.padi_scuba_courses to anon, authenticated;
grant insert, update, delete on table public.padi_scuba_courses to authenticated;
grant all on table public.padi_scuba_courses to service_role;

-- 5) Realtime so the public page updates when Admin edits rates/courses
do $$
begin
  alter publication supabase_realtime add table public.diving_rates;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.padi_scuba_courses;
exception
  when duplicate_object then null;
end $$;

-- 6) Public image bucket for hero + gallery (no extra database tables)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'scuba-diving',
  'scuba-diving',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg']
)
on conflict (id) do update
set
  public = true,
  file_size_limit = 8388608,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];

drop policy if exists "Public can view scuba images" on storage.objects;
drop policy if exists "Admins can upload scuba images" on storage.objects;
drop policy if exists "Admins can update scuba images" on storage.objects;
drop policy if exists "Admins can delete scuba images" on storage.objects;

create policy "Public can view scuba images"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'scuba-diving');

create policy "Admins can upload scuba images"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'scuba-diving' and public.is_approved_admin());

create policy "Admins can update scuba images"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'scuba-diving' and public.is_approved_admin())
  with check (bucket_id = 'scuba-diving' and public.is_approved_admin());

create policy "Admins can delete scuba images"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'scuba-diving' and public.is_approved_admin());

notify pgrst, 'reload schema';
