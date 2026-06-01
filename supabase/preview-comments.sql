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
  area jsonb,
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
  ),
  constraint preview_comments_area_check check (
    area is null
    or (
      jsonb_typeof(area) = 'object'
      and (area ? 'x')
      and (area ? 'y')
      and (area ? 'width')
      and (area ? 'height')
      and (area->>'x')::numeric >= 0
      and (area->>'y')::numeric >= 0
      and (area->>'width')::numeric > 0
      and (area->>'height')::numeric > 0
      and (area->>'x')::numeric + (area->>'width')::numeric <= 100
      and (area->>'y')::numeric + (area->>'height')::numeric <= 100
    )
  )
);

alter table public.preview_comments
  add column if not exists area jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'preview_comments_area_check'
      and conrelid = 'public.preview_comments'::regclass
  ) then
    alter table public.preview_comments
      add constraint preview_comments_area_check check (
        area is null
        or (
          jsonb_typeof(area) = 'object'
          and (area ? 'x')
          and (area ? 'y')
          and (area ? 'width')
          and (area ? 'height')
          and (area->>'x')::numeric >= 0
          and (area->>'y')::numeric >= 0
          and (area->>'width')::numeric > 0
          and (area->>'height')::numeric > 0
          and (area->>'x')::numeric + (area->>'width')::numeric <= 100
          and (area->>'y')::numeric + (area->>'height')::numeric <= 100
        )
      );
  end if;
end $$;

create index if not exists preview_comments_path_created_at_idx
  on public.preview_comments (preview_path, created_at asc);

alter table public.preview_comments enable row level security;

grant select, insert, delete on public.preview_comments to anon, authenticated;
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

drop policy if exists "preview_comments_public_delete" on public.preview_comments;
create policy "preview_comments_public_delete"
  on public.preview_comments for delete
  to anon, authenticated
  using (true);
