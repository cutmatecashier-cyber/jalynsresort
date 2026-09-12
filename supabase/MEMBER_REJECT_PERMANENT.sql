-- Permanently rejected members cannot be accepted again.
-- Run in Supabase SQL Editor.

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
  current_status text;
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

  select p.approval_status into current_status
  from public.profiles p
  where p.id = target_id;

  if current_status is null then
    raise exception 'Member profile not found';
  end if;

  if current_status = 'rejected' then
    raise exception 'This account was permanently rejected and cannot be accepted. Delete it instead.';
  end if;

  if not exists (
    select 1 from auth.users u
    where u.id = target_id and u.email_confirmed_at is not null
  ) then
    raise exception 'Member email is not verified';
  end if;

  if exists (
    select 1 from public.profiles p
    where p.id = target_id and p.role = 'admin'
  ) then
    raise exception 'Cannot modify an admin account from the members UI';
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
