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
