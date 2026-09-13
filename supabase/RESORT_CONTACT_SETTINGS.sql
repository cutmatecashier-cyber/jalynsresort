-- Resort contact settings (singleton row id = 1)
-- Run in Supabase SQL Editor

create table if not exists public.resort_contact_settings (
  id int primary key check (id = 1),
  contact_email text not null,
  phone text not null,
  facebook_url text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

insert into public.resort_contact_settings (id, contact_email, phone, facebook_url)
values (
  1,
  'jalynsresort@gmail.com',
  '+63 947 619 7535',
  'https://www.facebook.com/jalynsresortpuertogalera'
)
on conflict (id) do nothing;

-- Ensure helper exists (used by RLS). Safe to re-run.
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

alter table public.resort_contact_settings enable row level security;

drop policy if exists "Anyone can read resort contact settings" on public.resort_contact_settings;
drop policy if exists "Admins can update resort contact settings" on public.resort_contact_settings;
drop policy if exists "Admins can insert resort contact settings" on public.resort_contact_settings;

create policy "Anyone can read resort contact settings"
  on public.resort_contact_settings
  for select
  to anon, authenticated
  using (true);

create policy "Admins can update resort contact settings"
  on public.resort_contact_settings
  for update
  to authenticated
  using (public.is_approved_admin())
  with check (public.is_approved_admin());

create policy "Admins can insert resort contact settings"
  on public.resort_contact_settings
  for insert
  to authenticated
  with check (public.is_approved_admin());

grant select on table public.resort_contact_settings to anon, authenticated;
grant insert, update on table public.resort_contact_settings to authenticated;
grant all on table public.resort_contact_settings to service_role;

notify pgrst, 'reload schema';
