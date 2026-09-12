-- Run this in Supabase → SQL Editor → New query → Run
-- Creates profiles (if missing) and makes Rochelle an approved Admin.
-- Password stays in Auth only — not stored here.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  phone text not null default '',
  email text not null,
  role text check (role is null or role in ('admin', 'manager', 'owner')),
  approval_status text not null default 'pending'
    check (approval_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

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
  email = 'rochelleuchi38@gmail.com',
  name = coalesce(nullif(public.profiles.name, ''), 'Rochelle'),
  updated_at = now();
