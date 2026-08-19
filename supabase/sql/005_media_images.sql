-- Our Journey: metadatos para fotografías optimizadas
-- Ejecutar después de 004_seed_categories.sql desde el SQL Editor de Supabase.

alter table public.media
  add column if not exists thumbnail_path text,
  add column if not exists original_filename text,
  add column if not exists width integer,
  add column if not exists height integer,
  add column if not exists size_bytes bigint;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'media_thumbnail_path_not_blank' and conrelid = 'public.media'::regclass) then
    alter table public.media add constraint media_thumbnail_path_not_blank
      check (thumbnail_path is null or char_length(trim(thumbnail_path)) > 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'media_width_positive' and conrelid = 'public.media'::regclass) then
    alter table public.media add constraint media_width_positive check (width is null or width > 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'media_height_positive' and conrelid = 'public.media'::regclass) then
    alter table public.media add constraint media_height_positive check (height is null or height > 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'media_size_bytes_nonnegative' and conrelid = 'public.media'::regclass) then
    alter table public.media add constraint media_size_bytes_nonnegative
      check (size_bytes is null or size_bytes >= 0);
  end if;
end;
$$;

grant insert (
  memory_id,
  type,
  storage_path,
  thumbnail_path,
  original_filename,
  width,
  height,
  size_bytes,
  sort_order
) on table public.media to authenticated;

grant update (
  type,
  storage_path,
  thumbnail_path,
  original_filename,
  width,
  height,
  size_bytes,
  sort_order
) on table public.media to authenticated;

comment on column public.media.thumbnail_path is
  'Ruta interna del thumbnail privado en Storage. Nunca guardar una URL.';
