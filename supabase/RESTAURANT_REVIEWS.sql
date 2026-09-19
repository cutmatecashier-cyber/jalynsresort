-- Restaurant guest reviews (public read of approved; writes via backend service_role)
-- Run in Supabase SQL Editor. Safe to re-run.
--
-- Customer review and admin reply live on the same row, but reply fields are cleared
-- independently — deleting an admin reply never deletes the customer review.

create table if not exists public.restaurant_reviews (
  id uuid primary key default gen_random_uuid(),
  guest_name text not null,
  rating smallint not null check (rating >= 1 and rating <= 5),
  comment text not null,
  approved boolean not null default true,
  created_at timestamptz not null default now()
);

-- Optional account link + admin reply (one active reply per review)
alter table public.restaurant_reviews
  add column if not exists user_id uuid references auth.users (id) on delete set null;

alter table public.restaurant_reviews
  add column if not exists admin_reply text;

alter table public.restaurant_reviews
  add column if not exists admin_reply_by uuid references auth.users (id) on delete set null;

alter table public.restaurant_reviews
  add column if not exists admin_reply_name text;

alter table public.restaurant_reviews
  add column if not exists admin_reply_at timestamptz;

alter table public.restaurant_reviews
  add column if not exists updated_at timestamptz not null default now();

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

-- Inserts / reply updates go through backend service_role (bypasses RLS).
grant select on public.restaurant_reviews to anon, authenticated;
grant all on public.restaurant_reviews to service_role;

notify pgrst, 'reload schema';
