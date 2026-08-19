-- Our Journey: schema base
-- Ejecutar primero desde el SQL Editor de Supabase.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(trim(name)) between 1 and 60),
  icon text not null check (char_length(trim(icon)) between 1 and 40),
  created_at timestamptz not null default now()
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 160),
  description text,
  start_date date not null,
  end_date date,
  cover_path text,
  created_by uuid not null default auth.uid()
    references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trips_date_range check (end_date is null or end_date >= start_date)
);

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 160),
  description text,
  memory_date timestamptz not null,
  place_name text,
  latitude double precision not null
    check (latitude between -90 and 90),
  longitude double precision not null
    check (longitude between -180 and 180),
  category_id uuid not null
    references public.categories (id) on delete restrict,
  trip_id uuid
    references public.trips (id) on delete set null,
  importance smallint not null default 3
    check (importance between 1 and 5),
  created_by uuid not null default auth.uid()
    references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null
    references public.memories (id) on delete cascade,
  type text not null check (type in ('image', 'audio', 'video')),
  storage_path text not null unique
    check (char_length(trim(storage_path)) > 0),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now()
);

comment on column public.media.storage_path is
  'Ruta interna del objeto en Storage. Nunca guardar una URL pública.';

create table if not exists public.future_places (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 160),
  description text,
  latitude double precision not null
    check (latitude between -90 and 90),
  longitude double precision not null
    check (longitude between -180 and 180),
  target_date date,
  status text not null default 'idea'
    check (status in ('idea', 'planned', 'visited')),
  created_by uuid not null default auth.uid()
    references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists memories_memory_date_idx
  on public.memories (memory_date desc);
create index if not exists memories_category_id_idx
  on public.memories (category_id);
create index if not exists memories_trip_id_idx
  on public.memories (trip_id);
create index if not exists memories_created_by_idx
  on public.memories (created_by);
create index if not exists trips_start_date_idx
  on public.trips (start_date desc);
create index if not exists media_memory_id_sort_order_idx
  on public.media (memory_id, sort_order);
create index if not exists future_places_status_idx
  on public.future_places (status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trips_set_updated_at on public.trips;
create trigger trips_set_updated_at
before update on public.trips
for each row execute function public.set_updated_at();

drop trigger if exists memories_set_updated_at on public.memories;
create trigger memories_set_updated_at
before update on public.memories
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Miembro'
    ),
    'member'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Si los usuarios se crearon antes que este script, también se generan sus perfiles.
insert into public.profiles (id, display_name, role)
select
  user_row.id,
  coalesce(
    nullif(trim(user_row.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(coalesce(user_row.email, ''), '@', 1), ''),
    'Miembro'
  ),
  'member'
from auth.users as user_row
on conflict (id) do nothing;