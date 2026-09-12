-- Run in Supabase → SQL Editor → Run
-- Fixes: permission denied for table profiles

grant usage on schema public to anon, authenticated;
grant select, update on table public.profiles to authenticated;
grant select on table public.profiles to anon;

-- Ensure Rochelle is approved Admin
insert into public.profiles (id, name, phone, email, role, approval_status)
values (
  'f0db65d3-5eda-465c-83fb-332398a156ca',
  'Rochelle',
  '',
  'rochelleuchi38@gmail.com',
  'admin',
  'approved'
)
on conflict (id) do update
set
  role = 'admin',
  approval_status = 'approved',
  email = excluded.email,
  name = excluded.name,
  updated_at = now();

-- Make sure RLS policies exist (safe to re-run)
alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Admins can read all profiles" on public.profiles;
drop policy if exists "Users can update own safe fields" on public.profiles;
drop policy if exists "Admins can update any profile" on public.profiles;
drop policy if exists "No client inserts" on public.profiles;

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

create policy "Users can read own profile"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

create policy "Admins can read all profiles"
  on public.profiles for select to authenticated
  using (public.is_approved_admin());

create policy "Users can update own safe fields"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Admins can update any profile"
  on public.profiles for update to authenticated
  using (public.is_approved_admin())
  with check (public.is_approved_admin());

create policy "No client inserts"
  on public.profiles for insert to authenticated
  with check (false);
