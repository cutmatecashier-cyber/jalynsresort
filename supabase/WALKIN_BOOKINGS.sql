-- Walk-in bookings are stored on the same room_bookings table.
-- Safe to run more than once.

alter table public.room_bookings
  add column if not exists source text not null default 'online';
