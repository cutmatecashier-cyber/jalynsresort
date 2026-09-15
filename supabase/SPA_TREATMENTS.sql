-- Spa treatments: categories + services (public read; admin writes via backend service_role)
-- Run in Supabase SQL Editor.

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
