-- Extend resort contact settings with location and social links.
-- Safe to re-run. Uses the existing singleton row (id = 1).

alter table public.resort_contact_settings
  add column if not exists address text not null default 'Western Nautical Hwy, Puerto Galera',
  add column if not exists maps_url text not null default 'https://maps.google.com/?q=Jalyn''s+Resort+Puerto+Galera',
  add column if not exists messenger_url text not null default 'https://m.me/jalynsresortpuertogalera',
  add column if not exists twitter_url text not null default 'https://twitter.com/intent/tweet?url=',
  add column if not exists pinterest_url text not null default 'https://pinterest.com/pin/create/button/?url=',
  add column if not exists whatsapp_url text not null default 'https://wa.me/639476197535';

notify pgrst, 'reload schema';
