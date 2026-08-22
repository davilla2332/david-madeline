-- ============================================================
-- DAVID & MADELINE — Galería online para GitHub Pages
-- Ejecuta este archivo UNA VEZ en Supabase > SQL Editor.
-- ============================================================

-- 1) Bucket público para MOSTRAR las fotos en la web.
-- La subida seguirá protegida por RLS y requerirá sesión.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'couple-photos',
  'couple-photos',
  true,
  8388608,
  array['image/jpeg','image/png','image/webp','image/gif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2) Tabla con título, frase y URL de cada recuerdo.
create table if not exists public.couple_photos (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  caption text not null default '' check (char_length(caption) <= 220),
  storage_path text not null unique,
  public_url text not null,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.couple_photos enable row level security;

-- 3) Permisos mínimos para la Data API.
grant select on table public.couple_photos to anon;
grant select, insert, delete on table public.couple_photos to authenticated;

-- 4) Políticas de la tabla.
drop policy if exists "Public can view couple photos" on public.couple_photos;
create policy "Public can view couple photos"
on public.couple_photos
for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated users can add couple photos" on public.couple_photos;
create policy "Authenticated users can add couple photos"
on public.couple_photos
for insert
to authenticated
with check ((select auth.uid()) = uploaded_by);

drop policy if exists "Authenticated users can delete couple photos" on public.couple_photos;
create policy "Authenticated users can delete couple photos"
on public.couple_photos
for delete
to authenticated
using (true);

-- 5) Políticas de Storage.
-- No se permite subir nada sin haber iniciado sesión.
drop policy if exists "Authenticated upload to couple photos" on storage.objects;
create policy "Authenticated upload to couple photos"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'couple-photos');

-- Permite a usuarios autenticados borrar archivos del álbum.
-- Se usa, entre otras cosas, para limpiar un archivo si falla el registro de metadata.
drop policy if exists "Authenticated delete from couple photos" on storage.objects;
create policy "Authenticated delete from couple photos"
on storage.objects
for delete
to authenticated
using (bucket_id = 'couple-photos');

-- LISTO.
-- IMPORTANTE: en Authentication crea manualmente las cuentas que podrán subir fotos
-- y desactiva el registro público de nuevos usuarios si no lo necesitas.
