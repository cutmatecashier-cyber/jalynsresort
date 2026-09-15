-- Resort contact settings (singleton row id = 1)
-- Run in Supabase SQL Editor

create table if not exists public.resort_contact_settings (
  id int primary key check (id = 1),
  contact_email text not null,
  phone text not null,
  facebook_url text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

insert into public.resort_contact_settings (id, contact_email, phone, facebook_url)
values (
  1,
  'jalynsresort@gmail.com',
  '+63 947 619 7535',
  'https://www.facebook.com/jalynsresortpuertogalera'
)
on conflict (id) do nothing;

-- Ensure helper exists (used by RLS). Safe to re-run.
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

alter table public.resort_contact_settings enable row level security;

drop policy if exists "Anyone can read resort contact settings" on public.resort_contact_settings;
drop policy if exists "Admins can update resort contact settings" on public.resort_contact_settings;
drop policy if exists "Admins can insert resort contact settings" on public.resort_contact_settings;

create policy "Anyone can read resort contact settings"
  on public.resort_contact_settings
  for select
  to anon, authenticated
  using (true);

create policy "Admins can update resort contact settings"
  on public.resort_contact_settings
  for update
  to authenticated
  using (public.is_approved_admin())
  with check (public.is_approved_admin());

create policy "Admins can insert resort contact settings"
  on public.resort_contact_settings
  for insert
  to authenticated
  with check (public.is_approved_admin());

grant select on table public.resort_contact_settings to anon, authenticated;
grant insert, update on table public.resort_contact_settings to authenticated;
grant all on table public.resort_contact_settings to service_role;

notify pgrst, 'reload schema';
-- Restaurant menu: categories + items (public read; admin writes via backend service_role)
-- Run in Supabase SQL Editor.

create table if not exists public.restaurant_menu_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.restaurant_menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.restaurant_menu_categories (id) on delete cascade,
  name text not null,
  description text not null default '',
  price numeric(10, 2),
  image_url text,
  sort_order int not null default 0,
  available boolean not null default true,
  created_at timestamptz not null default now()
);

-- Safe if table already existed without image_url
alter table public.restaurant_menu_items
  add column if not exists image_url text;

create index if not exists restaurant_menu_categories_sort_idx
  on public.restaurant_menu_categories (sort_order asc, name asc);

create index if not exists restaurant_menu_items_category_sort_idx
  on public.restaurant_menu_items (category_id, sort_order asc, name asc);

-- Seed default categories (safe to re-run; skips if any categories already exist)
insert into public.restaurant_menu_categories (name, image_url, sort_order)
select * from (values
  ('Breakfast', null::text, 1),
  ('Salad & Soup', null::text, 2),
  ('Seafood & Filipino', null::text, 3),
  ('German Dishes', null::text, 4),
  ('Pasta', null::text, 5),
  ('Beef', null::text, 6),
  ('Burgers', null::text, 7),
  ('Pizza', null::text, 8),
  ('Pork', null::text, 9),
  ('Chicken', null::text, 10),
  ('Desserts', null::text, 11)
) as seed(name, image_url, sort_order)
where not exists (select 1 from public.restaurant_menu_categories limit 1);

alter table public.restaurant_menu_categories enable row level security;
alter table public.restaurant_menu_items enable row level security;

drop policy if exists "Public read restaurant menu categories" on public.restaurant_menu_categories;
create policy "Public read restaurant menu categories"
  on public.restaurant_menu_categories
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Public read restaurant menu items" on public.restaurant_menu_items;
create policy "Public read restaurant menu items"
  on public.restaurant_menu_items
  for select
  to anon, authenticated
  using (true);

grant select on public.restaurant_menu_categories to anon, authenticated;
grant select on public.restaurant_menu_items to anon, authenticated;
grant all on public.restaurant_menu_categories to service_role;
grant all on public.restaurant_menu_items to service_role;

notify pgrst, 'reload schema';
-- Restaurant guest reviews (public read of approved; public insert as pending)
-- Run in Supabase SQL Editor.

create table if not exists public.restaurant_reviews (
  id uuid primary key default gen_random_uuid(),
  guest_name text not null,
  rating smallint not null check (rating >= 1 and rating <= 5),
  comment text not null,
  approved boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists restaurant_reviews_created_at_idx
  on public.restaurant_reviews (created_at desc);

alter table public.restaurant_reviews enable row level security;

-- Public can read approved reviews
drop policy if exists "Public read approved restaurant reviews" on public.restaurant_reviews;
create policy "Public read approved restaurant reviews"
  on public.restaurant_reviews
  for select
  to anon, authenticated
  using (approved = true);

-- Inserts go through backend service_role (bypasses RLS). Optional anon insert if needed later.
grant select on public.restaurant_reviews to anon, authenticated;
grant all on public.restaurant_reviews to service_role;

-- ---------------------------------------------------------------------------
-- SPA treatments (categories + services)
-- Full file: supabase/SPA_TREATMENTS.sql
-- ---------------------------------------------------------------------------
create table if not exists public.spa_categories (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  note text,
  image_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.spa_services (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.spa_categories (id) on delete cascade,
  name text not null,
  mins int,
  rate text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists spa_categories_sort_idx
  on public.spa_categories (sort_order asc, label asc);

create index if not exists spa_services_category_sort_idx
  on public.spa_services (category_id, sort_order asc, name asc);

alter table public.spa_categories enable row level security;
alter table public.spa_services enable row level security;

drop policy if exists "Public read spa categories" on public.spa_categories;
create policy "Public read spa categories"
  on public.spa_categories
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Public read spa services" on public.spa_services;
create policy "Public read spa services"
  on public.spa_services
  for select
  to anon, authenticated
  using (true);

grant select on public.spa_categories to anon, authenticated;
grant select on public.spa_services to anon, authenticated;
grant all on public.spa_categories to service_role;
grant all on public.spa_services to service_role;

notify pgrst, 'reload schema';

