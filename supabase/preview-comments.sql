-- ─────────────────────────────────────────────────────────────────────────────
-- Commentaires publics pour les previews HTML hébergées
-- ─────────────────────────────────────────────────────────────────────────────
-- À exécuter dans le SQL Editor du projet Supabase utilisé par l'app.
-- Les commentaires sont accessibles à toute personne disposant du lien.

create table if not exists public.preview_comments (
  id uuid primary key default gen_random_uuid(),
  preview_path text not null,
  author_name text not null default 'Anonyme',
  body text not null,
  created_at timestamptz not null default now(),
  constraint preview_comments_path_check check (
    preview_path ~ '^[a-zA-Z0-9/_.,-]+\.html$'
    and position('..' in preview_path) = 0
    and left(preview_path, 1) <> '/'
  ),
  constraint preview_comments_author_name_check check (
    char_length(trim(author_name)) between 1 and 80
  ),
  constraint preview_comments_body_check check (
    char_length(trim(body)) between 1 and 2000
  )
);

create index if not exists preview_comments_path_created_at_idx
  on public.preview_comments (preview_path, created_at asc);

alter table public.preview_comments enable row level security;

grant select, insert on public.preview_comments to anon, authenticated;
grant usage on schema public to anon, authenticated;

drop policy if exists "preview_comments_public_read" on public.preview_comments;
create policy "preview_comments_public_read"
  on public.preview_comments for select
  to anon, authenticated
  using (true);

drop policy if exists "preview_comments_public_insert" on public.preview_comments;
create policy "preview_comments_public_insert"
  on public.preview_comments for insert
  to anon, authenticated
  with check (true);
