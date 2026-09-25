-- Rooms & apartments catalog (run in Supabase SQL Editor)
-- Safe to re-run. Images stay in storage bucket `rooms-page` (see ROOMS_PAGE.sql).
-- Tables: rooms, room_highlights, rooms_settings (voucher singleton).

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

-- 1) Rooms
create table if not exists public.rooms (
  id text primary key,
  name text not null,
  description text not null default '',
  size text not null default '',
  max_capacity text not null default '',
  beds text not null default '',
  price_per_night text not null default 'Contact for rates',
  extra_person_charge text not null default '',
  rules_policies text not null default '',
  status text not null default 'available'
    check (status in ('available', 'unavailable')),
  amenities text[] not null default '{}',
  images text[] not null default '{}',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rooms_sort_idx
  on public.rooms (sort_order asc, name asc);

-- 2) Jeepney / shuttle highlight photos
create table if not exists public.room_highlights (
  id text primary key,
  image text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists room_highlights_sort_idx
  on public.room_highlights (sort_order asc, created_at asc);

-- 3) Rooms page settings (voucher singleton — keep id = 1)
create table if not exists public.rooms_settings (
  id int primary key default 1 check (id = 1),
  voucher_enabled boolean not null default false,
  voucher_percent int not null default 0
    check (voucher_percent >= 0 and voucher_percent <= 100),
  updated_at timestamptz not null default now()
);

insert into public.rooms_settings (id, voucher_enabled, voucher_percent)
values (1, false, 0)
on conflict (id) do nothing;

-- 4) RLS — public read; writes via backend service_role (and approved admins)
alter table public.rooms enable row level security;
alter table public.room_highlights enable row level security;
alter table public.rooms_settings enable row level security;

drop policy if exists "Anyone can read rooms" on public.rooms;
drop policy if exists "Admins can insert rooms" on public.rooms;
drop policy if exists "Admins can update rooms" on public.rooms;
drop policy if exists "Admins can delete rooms" on public.rooms;

create policy "Anyone can read rooms"
  on public.rooms
  for select
  to anon, authenticated
  using (true);

create policy "Admins can insert rooms"
  on public.rooms
  for insert
  to authenticated
  with check (public.is_approved_admin());

create policy "Admins can update rooms"
  on public.rooms
  for update
  to authenticated
  using (public.is_approved_admin())
  with check (public.is_approved_admin());

create policy "Admins can delete rooms"
  on public.rooms
  for delete
  to authenticated
  using (public.is_approved_admin());

drop policy if exists "Anyone can read room highlights" on public.room_highlights;
drop policy if exists "Admins can insert room highlights" on public.room_highlights;
drop policy if exists "Admins can update room highlights" on public.room_highlights;
drop policy if exists "Admins can delete room highlights" on public.room_highlights;

create policy "Anyone can read room highlights"
  on public.room_highlights
  for select
  to anon, authenticated
  using (true);

create policy "Admins can insert room highlights"
  on public.room_highlights
  for insert
  to authenticated
  with check (public.is_approved_admin());

create policy "Admins can update room highlights"
  on public.room_highlights
  for update
  to authenticated
  using (public.is_approved_admin())
  with check (public.is_approved_admin());

create policy "Admins can delete room highlights"
  on public.room_highlights
  for delete
  to authenticated
  using (public.is_approved_admin());

drop policy if exists "Anyone can read rooms settings" on public.rooms_settings;
drop policy if exists "Admins can update rooms settings" on public.rooms_settings;
drop policy if exists "Admins can insert rooms settings" on public.rooms_settings;

create policy "Anyone can read rooms settings"
  on public.rooms_settings
  for select
  to anon, authenticated
  using (true);

create policy "Admins can insert rooms settings"
  on public.rooms_settings
  for insert
  to authenticated
  with check (public.is_approved_admin());

create policy "Admins can update rooms settings"
  on public.rooms_settings
  for update
  to authenticated
  using (public.is_approved_admin())
  with check (public.is_approved_admin());

grant select on public.rooms to anon, authenticated;
grant select on public.room_highlights to anon, authenticated;
grant select on public.rooms_settings to anon, authenticated;
grant all on public.rooms to service_role;
grant all on public.room_highlights to service_role;
grant all on public.rooms_settings to service_role;

notify pgrst, 'reload schema';
