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
