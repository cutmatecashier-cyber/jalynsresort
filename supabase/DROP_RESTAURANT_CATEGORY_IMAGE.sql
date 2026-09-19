-- Remove unused category picture column from restaurant menu categories.
-- Safe to re-run. Dish (item) photos are unchanged.

alter table public.restaurant_menu_categories
  drop column if exists image_url;

notify pgrst, 'reload schema';
