-- Jalyn's Resort — profiles + RLS
-- Run this in Supabase Dashboard → SQL Editor → New query → Run
-- Uses your EXISTING Supabase project. Does not create a new project.

-- Roles: admin | manager | owner (null until Admin assigns Manager/Owner)
-- New signups are NEVER admin and start as pending approval.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  phone text not null,
  email text not null,
  role text check (role is null or role in ('admin', 'manager', 'owner')),
  approval_status text not null default 'pending'
    check (approval_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists profiles_approval_status_idx on public.profiles (approval_status);

-- Keep updated_at fresh
create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_profiles_updated_at();

-- Create profile row when a user signs up (reads name/phone from auth metadata)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, phone, email, role, approval_status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    new.email,
    null,          -- no role until Admin assigns Manager or Owner
    'pending'      -- must be approved by Admin
  )
  on conflict (id) do update
    set
      name = excluded.name,
      phone = excluded.phone,
      email = excluded.email,
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Helper: is the current user an approved admin?
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

alter table public.profiles enable row level security;

-- Drop old policies if re-running
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Admins can read all profiles" on public.profiles;
drop policy if exists "Users can update own safe fields" on public.profiles;
drop policy if exists "Admins can update any profile" on public.profiles;
drop policy if exists "No client inserts" on public.profiles;

-- Users read their own row
create policy "Users can read own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

-- Admins read everyone
create policy "Admins can read all profiles"
  on public.profiles
  for select
  to authenticated
  using (public.is_approved_admin());

-- Users may update their own row (role/approval locked by trigger below)
create policy "Users can update own safe fields"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Admins can update any profile (approve + assign Manager/Owner)
create policy "Admins can update any profile"
  on public.profiles
  for update
  to authenticated
  using (public.is_approved_admin())
  with check (public.is_approved_admin());

-- Profile inserts happen only via the security-definer trigger
create policy "No client inserts"
  on public.profiles
  for insert
  to authenticated
  with check (false);

-- Hard lock: non-admins cannot change role or approval_status (even via API)
create or replace function public.prevent_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_approved_admin() then
    -- Admin may assign Manager or Owner only (or keep existing admin)
    if new.role is not null
       and new.role not in ('admin', 'manager', 'owner') then
      raise exception 'Invalid role';
    end if;
    -- Disallow promoting others to admin from the client app
    if new.role = 'admin' and old.role is distinct from 'admin' then
      raise exception 'Admin role can only be granted via SQL by a project owner';
    end if;
    return new;
  end if;

  if new.role is distinct from old.role
     or new.approval_status is distinct from old.approval_status then
    raise exception 'You cannot change your own role or approval status';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_prevent_privilege_escalation on public.profiles;
create trigger profiles_prevent_privilege_escalation
  before update on public.profiles
  for each row
  execute function public.prevent_privilege_escalation();

-- ------------------------------------------------------------
-- FIRST ADMIN (run AFTER you sign up with your real email):
-- Replace the email below, then run in SQL Editor.
-- ------------------------------------------------------------
-- update public.profiles
-- set role = 'admin', approval_status = 'approved'
-- where email = 'your-admin@gmail.com';
