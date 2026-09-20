-- Site / homepage guest reviews (public read of approved; writes via backend service_role)
-- Run in Supabase SQL Editor. Safe to re-run.

create table if not exists public.site_reviews (
  id uuid primary key default gen_random_uuid(),
  guest_name text not null,
  rating smallint not null check (rating >= 1 and rating <= 5),
  comment text not null,
  approved boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.site_reviews
  add column if not exists user_id uuid references auth.users (id) on delete set null;

create index if not exists site_reviews_created_at_idx
  on public.site_reviews (created_at desc);

alter table public.site_reviews enable row level security;

drop policy if exists "Public read approved site reviews" on public.site_reviews;
create policy "Public read approved site reviews"
  on public.site_reviews
  for select
  to anon, authenticated
  using (approved = true);

grant select on public.site_reviews to anon, authenticated;
grant all on public.site_reviews to service_role;

notify pgrst, 'reload schema';
