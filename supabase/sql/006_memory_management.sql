-- Our Journey: gestión completa de recuerdos, portada y orden de fotografías.
-- Ejecutar después de 005_media_images.sql desde el SQL Editor de Supabase.

alter table public.memories
  add column if not exists cover_media_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'memories_cover_media_id_fkey'
      and conrelid = 'public.memories'::regclass
  ) then
    alter table public.memories
      add constraint memories_cover_media_id_fkey
      foreign key (cover_media_id)
      references public.media (id)
      on delete set null;
  end if;
end;
$$;

create index if not exists memories_cover_media_id_idx
  on public.memories (cover_media_id)
  where cover_media_id is not null;

create or replace function public.validate_memory_cover_media()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.cover_media_id is not null and not exists (
    select 1
    from public.media as media_row
    where media_row.id = new.cover_media_id
      and media_row.memory_id = new.id
      and media_row.type = 'image'
  ) then
    raise exception 'La portada debe ser una fotografía del mismo recuerdo.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke execute on function public.validate_memory_cover_media() from public, anon, authenticated;

drop trigger if exists memories_validate_cover_media on public.memories;
create trigger memories_validate_cover_media
before insert or update of cover_media_id on public.memories
for each row execute function public.validate_memory_cover_media();

create or replace function public.reorder_memory_media(
  p_memory_id uuid,
  p_ordered_media_ids uuid[]
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  expected_count integer;
  submitted_count integer;
  unique_count integer;
  updated_count integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Se requiere una sesión autenticada.' using errcode = '42501';
  end if;

  perform 1
  from public.memories as memory_row
  where memory_row.id = p_memory_id
  for update;

  if not found then
    raise exception 'El recuerdo no existe o no está disponible.' using errcode = 'P0002';
  end if;

  select count(*)::integer
  into expected_count
  from public.media as media_row
  where media_row.memory_id = p_memory_id
    and media_row.type = 'image';

  submitted_count := coalesce(pg_catalog.array_length(p_ordered_media_ids, 1), 0);

  select count(distinct ordered_id)::integer
  into unique_count
  from unnest(coalesce(p_ordered_media_ids, array[]::uuid[])) as submitted(ordered_id);

  if submitted_count <> expected_count or unique_count <> submitted_count then
    raise exception 'La lista de fotografías no coincide con el recuerdo.'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_ordered_media_ids, array[]::uuid[])) as submitted(ordered_id)
    where not exists (
      select 1
      from public.media as media_row
      where media_row.id = submitted.ordered_id
        and media_row.memory_id = p_memory_id
        and media_row.type = 'image'
    )
  ) then
    raise exception 'No se puede ordenar una fotografía de otro recuerdo.'
      using errcode = '23514';
  end if;

  update public.media as media_row
  set sort_order = (ordered_item.position - 1)::integer
  from unnest(coalesce(p_ordered_media_ids, array[]::uuid[]))
    with ordinality as ordered_item(media_id, position)
  where media_row.id = ordered_item.media_id
    and media_row.memory_id = p_memory_id
    and media_row.type = 'image';

  get diagnostics updated_count = row_count;

  if updated_count <> expected_count then
    raise exception 'No se pudo actualizar el orden completo de las fotografías.'
      using errcode = '40001';
  end if;
end;
$$;

revoke all on function public.reorder_memory_media(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_memory_media(uuid, uuid[]) to authenticated;

grant update (cover_media_id) on table public.memories to authenticated;

comment on column public.memories.cover_media_id is
  'Fotografía privada elegida como portada. Debe pertenecer al mismo recuerdo.';
comment on function public.reorder_memory_media(uuid, uuid[]) is
  'Reordena atómicamente todas las fotografías de un recuerdo con valores continuos desde cero.';