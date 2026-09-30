-- Lets staff mark a booking when the guest did not arrive.
-- Safe to run more than once.
alter table public.room_bookings drop constraint if exists room_bookings_status_check;

alter table public.room_bookings
  add constraint room_bookings_status_check
  check (status in ('pending', 'confirmed', 'completed', 'no_show'));
