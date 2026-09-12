-- Run in Supabase SQL Editor (required for Gmail verification codes)

create table if not exists public.auth_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  purpose text not null check (purpose in ('email_verify', 'password_reset')),
  code_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists auth_codes_email_purpose_idx
  on public.auth_codes (email, purpose, created_at desc);

create index if not exists auth_codes_user_idx
  on public.auth_codes (user_id);

alter table public.auth_codes enable row level security;

drop policy if exists "No client access to auth_codes" on public.auth_codes;
create policy "No client access to auth_codes"
  on public.auth_codes
  for all
  to authenticated, anon
  using (false)
  with check (false);

-- Backend service_role must be able to read/write these tables
grant usage on schema public to service_role;
grant all on table public.auth_codes to service_role;
grant all on table public.profiles to service_role;
grant usage, select on all sequences in schema public to service_role;
