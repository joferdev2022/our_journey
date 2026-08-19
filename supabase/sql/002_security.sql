-- Our Journey: privilegios y Row Level Security
-- Ejecutar después de 001_schema.sql.
-- El modelo inicial comparte los datos entre todos los usuarios autenticados.
-- Esto es seguro mientras el registro público permanezca deshabilitado.

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.trips enable row level security;
alter table public.memories enable row level security;
alter table public.media enable row level security;
alter table public.future_places enable row level security;

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.categories from anon, authenticated;
revoke all on table public.trips from anon, authenticated;
revoke all on table public.memories from anon, authenticated;
revoke all on table public.media from anon, authenticated;
revoke all on table public.future_places from anon, authenticated;

grant usage on schema public to authenticated;

grant select on table public.profiles to authenticated;
grant update (display_name) on table public.profiles to authenticated;

grant select on table public.categories to authenticated;

grant select, delete on table public.trips to authenticated;
grant insert (title, description, start_date, end_date, cover_path)
  on table public.trips to authenticated;
grant update (title, description, start_date, end_date, cover_path)
  on table public.trips to authenticated;

grant select, delete on table public.memories to authenticated;
grant insert (
  title,
  description,
  memory_date,
  place_name,
  latitude,
  longitude,
  category_id,
  trip_id,
  importance
) on table public.memories to authenticated;
grant update (
  title,
  description,
  memory_date,
  place_name,
  latitude,
  longitude,
  category_id,
  trip_id,
  importance
) on table public.memories to authenticated;

grant select, delete on table public.media to authenticated;
grant insert (memory_id, type, storage_path, sort_order)
  on table public.media to authenticated;
grant update (type, storage_path, sort_order)
  on table public.media to authenticated;

grant select, delete on table public.future_places to authenticated;
grant insert (
  title,
  description,
  latitude,
  longitude,
  target_date,
  status
) on table public.future_places to authenticated;
grant update (
  title,
  description,
  latitude,
  longitude,
  target_date,
  status
) on table public.future_places to authenticated;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
on public.profiles
for select
to authenticated
using ((select auth.uid()) is not null);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists "categories_select_authenticated" on public.categories;
create policy "categories_select_authenticated"
on public.categories
for select
to authenticated
using ((select auth.uid()) is not null);

drop policy if exists "trips_select_authenticated" on public.trips;
create policy "trips_select_authenticated"
on public.trips
for select
to authenticated
using ((select auth.uid()) is not null);

drop policy if exists "trips_insert_authenticated" on public.trips;
create policy "trips_insert_authenticated"
on public.trips
for insert
to authenticated
with check (created_by = (select auth.uid()));

drop policy if exists "trips_update_authenticated" on public.trips;
create policy "trips_update_authenticated"
on public.trips
for update
to authenticated
using ((select auth.uid()) is not null)
with check ((select auth.uid()) is not null);

drop policy if exists "trips_delete_authenticated" on public.trips;
create policy "trips_delete_authenticated"
on public.trips
for delete
to authenticated
using ((select auth.uid()) is not null);

drop policy if exists "memories_select_authenticated" on public.memories;
create policy "memories_select_authenticated"
on public.memories
for select
to authenticated
using ((select auth.uid()) is not null);

drop policy if exists "memories_insert_authenticated" on public.memories;
create policy "memories_insert_authenticated"
on public.memories
for insert
to authenticated
with check (created_by = (select auth.uid()));

drop policy if exists "memories_update_authenticated" on public.memories;
create policy "memories_update_authenticated"
on public.memories
for update
to authenticated
using ((select auth.uid()) is not null)
with check ((select auth.uid()) is not null);

drop policy if exists "memories_delete_authenticated" on public.memories;
create policy "memories_delete_authenticated"
on public.memories
for delete
to authenticated
using ((select auth.uid()) is not null);

drop policy if exists "media_select_authenticated" on public.media;
create policy "media_select_authenticated"
on public.media
for select
to authenticated
using ((select auth.uid()) is not null);

drop policy if exists "media_insert_authenticated" on public.media;
create policy "media_insert_authenticated"
on public.media
for insert
to authenticated
with check ((select auth.uid()) is not null);

drop policy if exists "media_update_authenticated" on public.media;
create policy "media_update_authenticated"
on public.media
for update
to authenticated
using ((select auth.uid()) is not null)
with check ((select auth.uid()) is not null);

drop policy if exists "media_delete_authenticated" on public.media;
create policy "media_delete_authenticated"
on public.media
for delete
to authenticated
using ((select auth.uid()) is not null);

drop policy if exists "future_places_select_authenticated" on public.future_places;
create policy "future_places_select_authenticated"
on public.future_places
for select
to authenticated
using ((select auth.uid()) is not null);

drop policy if exists "future_places_insert_authenticated" on public.future_places;
create policy "future_places_insert_authenticated"
on public.future_places
for insert
to authenticated
with check (created_by = (select auth.uid()));

drop policy if exists "future_places_update_authenticated" on public.future_places;
create policy "future_places_update_authenticated"
on public.future_places
for update
to authenticated
using ((select auth.uid()) is not null)
with check ((select auth.uid()) is not null);

drop policy if exists "future_places_delete_authenticated" on public.future_places;
create policy "future_places_delete_authenticated"
on public.future_places
for delete
to authenticated
using ((select auth.uid()) is not null);