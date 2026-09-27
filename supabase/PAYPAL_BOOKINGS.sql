-- PayPal receipt columns on room bookings.
-- Safe to run more than once.

alter table public.room_bookings
  add column if not exists paypal_order_id text,
  add column if not exists paypal_capture_id text;
