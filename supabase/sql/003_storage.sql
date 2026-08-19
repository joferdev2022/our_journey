-- Our Journey: bucket privado y políticas de Storage
-- Ejecutar después de 002_security.sql desde el SQL Editor de Supabase.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'journey-media',
  'journey-media',
  false,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'audio/mpeg',
    'audio/mp4',
    'audio/ogg',
    'audio/webm',
    'video/mp4',
    'video/webm'
  ]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;


drop policy if exists "journey_media_select_authenticated"
  on storage.objects;
create policy "journey_media_select_authenticated"
on storage.objects
for select
to authenticated
using (bucket_id = 'journey-media');

drop policy if exists "journey_media_insert_authenticated"
  on storage.objects;
create policy "journey_media_insert_authenticated"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'journey-media');

drop policy if exists "journey_media_update_authenticated"
  on storage.objects;
create policy "journey_media_update_authenticated"
on storage.objects
for update
to authenticated
using (bucket_id = 'journey-media')
with check (bucket_id = 'journey-media');

drop policy if exists "journey_media_delete_authenticated"
  on storage.objects;
create policy "journey_media_delete_authenticated"
on storage.objects
for delete
to authenticated
using (bucket_id = 'journey-media');

-- Los privilegios internos del schema storage los gestiona Supabase; estas policies limitan las filas.
-- No existe ninguna policy para anon y el bucket permanece privado.
-- Los archivos se consumen con una sesión válida o una Signed URL temporal.