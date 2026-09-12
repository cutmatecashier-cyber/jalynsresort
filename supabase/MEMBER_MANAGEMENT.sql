-- Member Management migration (run in Supabase SQL Editor)
-- Safe to re-run. Uses existing public.profiles + Auth. Does NOT store passwords.

-- 1) Extra audit columns
alter table public.profiles
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references auth.users (id);

-- 2) Grants
grant usage on schema public to anon, authenticated;
grant select, update on table public.profiles to authenticated;
grant select on table public.profiles to anon;

-- 3) Admin helper
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

-- 4) List ONLY email-verified members (joins auth.users)
create or replace function public.admin_list_verified_members()
returns table (
  id uuid,
  name text,
  phone text,
  email text,
  role text,
  approval_status text,
  created_at timestamptz,
  updated_at timestamptz,
  approved_at timestamptz,
  approved_by uuid,
  email_verified boolean,
  email_confirmed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_approved_admin() then
    raise exception 'Only approved admins can list members';
  end if;

  return query
  select
    p.id,
    p.name,
    p.phone,
    p.email,
    p.role,
    p.approval_status,
    p.created_at,
    p.updated_at,
    p.approved_at,
    p.approved_by,
    true as email_verified,
    u.email_confirmed_at
  from public.profiles p
  inner join auth.users u on u.id = p.id
  where u.email_confirmed_at is not null
  order by p.created_at desc;
end;
$$;

revoke all on function public.admin_list_verified_members() from public;
grant execute on function public.admin_list_verified_members() to authenticated;

-- 5) Accept member (Manager or Owner only) + audit fields
create or replace function public.admin_accept_member(
  target_id uuid,
  new_role text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.profiles;
begin
  if not public.is_approved_admin() then
    raise exception 'Only approved admins can accept members';
  end if;

  if new_role not in ('manager', 'owner') then
    raise exception 'Role must be manager or owner';
  end if;

  if target_id = auth.uid() then
    raise exception 'You cannot change your own role via this action';
  end if;

  -- Must be email-verified in Auth
  if not exists (
    select 1 from auth.users u
    where u.id = target_id and u.email_confirmed_at is not null
  ) then
    raise exception 'Member email is not verified';
  end if;

  -- Never accept/overwrite another admin via this function
  if exists (
    select 1 from public.profiles p
    where p.id = target_id and p.role = 'admin'
  ) then
    raise exception 'Cannot modify an admin account from the members UI';
  end if;

  if exists (
    select 1 from public.profiles p
    where p.id = target_id and p.approval_status = 'rejected'
  ) then
    raise exception 'This account was permanently rejected and cannot be accepted. Delete it instead.';
  end if;

  update public.profiles
  set
    role = new_role,
    approval_status = 'approved',
    approved_at = now(),
    approved_by = auth.uid(),
    updated_at = now()
  where id = target_id
  returning * into result;

  if result.id is null then
    raise exception 'Member profile not found';
  end if;

  return result;
end;
$$;

revoke all on function public.admin_accept_member(uuid, text) from public;
grant execute on function public.admin_accept_member(uuid, text) to authenticated;

-- 6) Reject member (keep Auth account; mark rejected)
create or replace function public.admin_reject_member(target_id uuid)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.profiles;
begin
  if not public.is_approved_admin() then
    raise exception 'Only approved admins can reject members';
  end if;

  if target_id = auth.uid() then
    raise exception 'You cannot reject your own account';
  end if;

  if exists (
    select 1 from public.profiles p
    where p.id = target_id and p.role = 'admin'
  ) then
    raise exception 'Cannot reject an admin account from the members UI';
  end if;

  update public.profiles
  set
    role = null,
    approval_status = 'rejected',
    approved_at = null,
    approved_by = auth.uid(),
    updated_at = now()
  where id = target_id
  returning * into result;

  if result.id is null then
    raise exception 'Member profile not found';
  end if;

  return result;
end;
$$;

revoke all on function public.admin_reject_member(uuid) from public;
grant execute on function public.admin_reject_member(uuid) to authenticated;

-- 7) RLS (re-apply)
alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Admins can read all profiles" on public.profiles;
drop policy if exists "Users can update own safe fields" on public.profiles;
drop policy if exists "Admins can update any profile" on public.profiles;
drop policy if exists "No client inserts" on public.profiles;

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

-- Direct table updates by admin still allowed; prefer RPC for accept/reject
create policy "Admins can update any profile"
  on public.profiles for update to authenticated
  using (public.is_approved_admin())
  with check (public.is_approved_admin());

create policy "No client inserts"
  on public.profiles for insert to authenticated
  with check (false);

-- 8) Privilege lock on direct updates
create or replace function public.prevent_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_approved_admin() then
    if new.role is not null and new.role not in ('admin', 'manager', 'owner') then
      raise exception 'Invalid role';
    end if;
    if new.role = 'admin' and old.role is distinct from 'admin' then
      raise exception 'Admin role can only be granted via SQL by a project owner';
    end if;
    return new;
  end if;

  if new.role is distinct from old.role
     or new.approval_status is distinct from old.approval_status
     or new.approved_at is distinct from old.approved_at
     or new.approved_by is distinct from old.approved_by then
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
