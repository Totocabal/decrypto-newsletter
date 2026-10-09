-- ─────────────────────────────────────────────────────────────────────────────
-- Migration : fonds du créateur de hero ajoutés depuis l'interface admin
-- ─────────────────────────────────────────────────────────────────────────────
-- Les fichiers sont stockés dans le bucket public "newsletter-images", dossier
-- "hero-backgrounds/" ; cette table garde le libellé, l'URL et la couleur de texte
-- conseillée. Lecture pour les comptes approuvés, écriture réservée aux admins.

create table if not exists public.hero_backgrounds (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  url text not null,
  path text not null,
  text_color text not null default 'dark' check (text_color in ('dark', 'light')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

alter table public.hero_backgrounds enable row level security;

drop policy if exists "hero_backgrounds_select_approved" on public.hero_backgrounds;
create policy "hero_backgrounds_select_approved"
  on public.hero_backgrounds for select
  to authenticated
  using (public.current_user_is_approved());

drop policy if exists "hero_backgrounds_insert_admin" on public.hero_backgrounds;
create policy "hero_backgrounds_insert_admin"
  on public.hero_backgrounds for insert
  to authenticated
  with check (public.current_user_is_admin());

drop policy if exists "hero_backgrounds_update_admin" on public.hero_backgrounds;
create policy "hero_backgrounds_update_admin"
  on public.hero_backgrounds for update
  to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

drop policy if exists "hero_backgrounds_delete_admin" on public.hero_backgrounds;
create policy "hero_backgrounds_delete_admin"
  on public.hero_backgrounds for delete
  to authenticated
  using (public.current_user_is_admin());

drop trigger if exists hero_backgrounds_touch on public.hero_backgrounds;
create trigger hero_backgrounds_touch
  before update on public.hero_backgrounds
  for each row execute function public.touch_updated_at();

-- Seuls les admins déposent des fichiers dans le dossier hero-backgrounds/
drop policy if exists "newsletter_images_upload_approved" on storage.objects;
create policy "newsletter_images_upload_approved"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'newsletter-images'
    and public.current_user_is_approved()
    and (
      (storage.foldername(name))[1] is distinct from 'hero-backgrounds'
      or public.current_user_is_admin()
    )
  );
