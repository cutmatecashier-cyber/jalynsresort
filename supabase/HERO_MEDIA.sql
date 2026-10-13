-- Allow short MP4 hero backgrounds in the existing public media buckets.
update storage.buckets
set
  file_size_limit = greatest(coalesce(file_size_limit, 0), 41943040),
  allowed_mime_types = (
    select array_agg(distinct mime)
    from unnest(
      coalesce(allowed_mime_types, array[]::text[])
      || array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg', 'video/mp4']
    ) as mime
  )
where id in (
  'home-page',
  'rooms-page',
  'gallery-page',
  'spa-page',
  'news-page',
  'restaurant-page',
  'contact-page',
  'scuba-diving'
);
