-- ============================================================
-- DAVID & MADELINE — ACTUALIZACIÓN V2
-- Ejecuta este archivo UNA VEZ si ya instalaste la versión anterior.
-- Añade edición de fotos y capítulos dinámicos.
-- ============================================================

-- 1) Campos nuevos para edición de fotos.
alter table public.couple_photos
  add column if not exists updated_at timestamptz;

grant update on table public.couple_photos to authenticated;

drop policy if exists "Authenticated users can edit couple photos" on public.couple_photos;
create policy "Authenticated users can edit couple photos"
on public.couple_photos
for update
to authenticated
using (true)
with check (true);

-- 2) Capítulos dinámicos de la historia.
create table if not exists public.story_chapters (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 100),
  story_date date not null,
  body text not null check (char_length(body) between 1 and 3000),
  emoji text not null default '❤' check (char_length(emoji) between 1 and 8),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

alter table public.story_chapters enable row level security;

grant select on table public.story_chapters to anon;
grant select, insert, update, delete on table public.story_chapters to authenticated;

drop policy if exists "Public can view story chapters" on public.story_chapters;
create policy "Public can view story chapters"
on public.story_chapters
for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated users can add chapters" on public.story_chapters;
create policy "Authenticated users can add chapters"
on public.story_chapters
for insert
to authenticated
with check ((select auth.uid()) = created_by);

drop policy if exists "Authenticated users can edit chapters" on public.story_chapters;
create policy "Authenticated users can edit chapters"
on public.story_chapters
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can delete chapters" on public.story_chapters;
create policy "Authenticated users can delete chapters"
on public.story_chapters
for delete
to authenticated
using (true);

-- No se necesita una policy UPDATE en storage.objects: cuando reemplazas una foto,
-- la web sube un archivo nuevo, actualiza la fila y luego elimina el archivo anterior.
