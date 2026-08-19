-- Our Journey: categorías iniciales
-- Ejecutar después de 003_storage.sql. Es seguro volver a ejecutar este script.

insert into public.categories (name, icon)
values
  ('Cita', 'heart'),
  ('Viaje', 'plane'),
  ('Comida', 'utensils'),
  ('Aventura', 'mountain'),
  ('Cumpleaños', 'cake'),
  ('Gracioso', 'laugh'),
  ('Especial', 'star')
on conflict (name) do update
set icon = excluded.icon;