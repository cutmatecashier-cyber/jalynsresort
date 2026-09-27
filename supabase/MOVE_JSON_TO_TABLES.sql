-- Move site-data JSON documents into database tables.
-- Photos stay in the public page buckets (home-page, rooms-page, and so on).
-- Safe to re-run. Then restart the backend so existing JSON is copied in once.

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

-- Room inventory lives on the room row.
alter table public.rooms
  add column if not exists quantity int not null default 1;

alter table public.rooms
  drop constraint if exists rooms_quantity_range;

alter table public.rooms
  add constraint rooms_quantity_range check (quantity >= 1 and quantity <= 99);

-- Check-in / check-out clock on the existing rooms settings row.
alter table public.rooms_settings
  add column if not exists check_in_time text not null default '14:00';

alter table public.rooms_settings
  add column if not exists check_out_time text not null default '11:00';

create table if not exists public.room_extra_person_rules (
  id text primary key,
  min_age int not null,
  max_age int,
  charge int not null,
  applies_to text not null check (applies_to in ('adults', 'kids', 'both')),
  sort_order int not null default 0
);

create table if not exists public.room_bookings (
  id text primary key,
  room_id text not null,
  room_name text not null,
  check_in date not null,
  check_out date not null,
  nights int not null,
  guests int not null,
  adults int not null,
  kids int not null default 0,
  extra_guests jsonb not null default '[]'::jsonb,
  extra_person_total int not null default 0,
  full_name text not null,
  email text not null,
  phone text not null,
  price_per_night text,
  estimated_total text,
  voucher_percent int,
  status text not null default 'confirmed'
    check (status in ('pending', 'confirmed', 'completed')),
  created_at timestamptz not null default now()
);

create index if not exists room_bookings_room_idx
  on public.room_bookings (room_id, check_in, check_out);

create index if not exists room_bookings_created_idx
  on public.room_bookings (created_at desc);

create table if not exists public.home_hero_slides (
  id text primary key,
  image text not null,
  alt text not null default '',
  sort_order int not null default 0
);

create table if not exists public.home_sections (
  section_key text primary key,
  image text not null
);

create table if not exists public.gallery_photos (
  id text primary key,
  alt text not null default '',
  image text not null,
  sort_order int not null default 0
);

create table if not exists public.news_posts (
  id text primary key,
  category text not null default '',
  title text not null,
  excerpt text not null default '',
  body text not null default '',
  image text not null,
  cta text not null default 'Read more',
  href text not null default '',
  kind text not null default 'news' check (kind in ('news', 'offer', 'event')),
  date date not null default current_date,
  price text,
  gallery jsonb,
  packages jsonb,
  video_url text,
  sort_order int not null default 0
);

create index if not exists news_posts_date_idx
  on public.news_posts (date desc);

create table if not exists public.content_revision (
  id int primary key check (id = 1),
  revision bigint not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.content_revision (id, revision)
values (1, 0)
on conflict (id) do nothing;

create table if not exists public.site_data_imports (
  key text primary key,
  imported_at timestamptz not null default now()
);

alter table public.room_extra_person_rules enable row level security;
alter table public.room_bookings enable row level security;
alter table public.home_hero_slides enable row level security;
alter table public.home_sections enable row level security;
alter table public.gallery_photos enable row level security;
alter table public.news_posts enable row level security;
alter table public.content_revision enable row level security;
alter table public.site_data_imports enable row level security;

drop policy if exists "Anyone can read extra person rules" on public.room_extra_person_rules;
drop policy if exists "Admins can insert extra person rules" on public.room_extra_person_rules;
drop policy if exists "Admins can update extra person rules" on public.room_extra_person_rules;
drop policy if exists "Admins can delete extra person rules" on public.room_extra_person_rules;

create policy "Anyone can read extra person rules"
  on public.room_extra_person_rules for select to anon, authenticated using (true);
create policy "Admins can insert extra person rules"
  on public.room_extra_person_rules for insert to authenticated with check (public.is_approved_admin());
create policy "Admins can update extra person rules"
  on public.room_extra_person_rules for update to authenticated
  using (public.is_approved_admin()) with check (public.is_approved_admin());
create policy "Admins can delete extra person rules"
  on public.room_extra_person_rules for delete to authenticated using (public.is_approved_admin());

drop policy if exists "Admins can read room bookings" on public.room_bookings;
drop policy if exists "Admins can insert room bookings" on public.room_bookings;
drop policy if exists "Admins can update room bookings" on public.room_bookings;
drop policy if exists "Admins can delete room bookings" on public.room_bookings;

create policy "Admins can read room bookings"
  on public.room_bookings for select to authenticated using (public.is_approved_admin());
create policy "Admins can insert room bookings"
  on public.room_bookings for insert to authenticated with check (public.is_approved_admin());
create policy "Admins can update room bookings"
  on public.room_bookings for update to authenticated
  using (public.is_approved_admin()) with check (public.is_approved_admin());
create policy "Admins can delete room bookings"
  on public.room_bookings for delete to authenticated using (public.is_approved_admin());

drop policy if exists "Anyone can read home hero slides" on public.home_hero_slides;
drop policy if exists "Admins can write home hero slides" on public.home_hero_slides;
create policy "Anyone can read home hero slides"
  on public.home_hero_slides for select to anon, authenticated using (true);
create policy "Admins can write home hero slides"
  on public.home_hero_slides for all to authenticated
  using (public.is_approved_admin()) with check (public.is_approved_admin());

drop policy if exists "Anyone can read home sections" on public.home_sections;
drop policy if exists "Admins can write home sections" on public.home_sections;
create policy "Anyone can read home sections"
  on public.home_sections for select to anon, authenticated using (true);
create policy "Admins can write home sections"
  on public.home_sections for all to authenticated
  using (public.is_approved_admin()) with check (public.is_approved_admin());

drop policy if exists "Anyone can read gallery photos" on public.gallery_photos;
drop policy if exists "Admins can write gallery photos" on public.gallery_photos;
create policy "Anyone can read gallery photos"
  on public.gallery_photos for select to anon, authenticated using (true);
create policy "Admins can write gallery photos"
  on public.gallery_photos for all to authenticated
  using (public.is_approved_admin()) with check (public.is_approved_admin());

drop policy if exists "Anyone can read news posts" on public.news_posts;
drop policy if exists "Admins can write news posts" on public.news_posts;
create policy "Anyone can read news posts"
  on public.news_posts for select to anon, authenticated using (true);
create policy "Admins can write news posts"
  on public.news_posts for all to authenticated
  using (public.is_approved_admin()) with check (public.is_approved_admin());

drop policy if exists "Anyone can read content revision" on public.content_revision;
drop policy if exists "Admins can write content revision" on public.content_revision;
create policy "Anyone can read content revision"
  on public.content_revision for select to anon, authenticated using (true);
create policy "Admins can write content revision"
  on public.content_revision for all to authenticated
  using (public.is_approved_admin()) with check (public.is_approved_admin());

grant select on public.room_extra_person_rules to anon, authenticated;
grant select on public.home_hero_slides to anon, authenticated;
grant select on public.home_sections to anon, authenticated;
grant select on public.gallery_photos to anon, authenticated;
grant select on public.news_posts to anon, authenticated;
grant select on public.content_revision to anon, authenticated;
grant select on public.room_bookings to authenticated;

grant all on public.room_extra_person_rules to service_role;
grant all on public.room_bookings to service_role;
grant all on public.home_hero_slides to service_role;
grant all on public.home_sections to service_role;
grant all on public.gallery_photos to service_role;
grant all on public.news_posts to service_role;
grant all on public.content_revision to service_role;
grant all on public.site_data_imports to service_role;

notify pgrst, 'reload schema';
