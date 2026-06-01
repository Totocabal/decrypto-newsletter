-- ─────────────────────────────────────────────────────────────────────────────
-- Migration : bucket Supabase Storage pour les images de newsletter
-- ─────────────────────────────────────────────────────────────────────────────
-- À exécuter une fois dans le SQL Editor de Supabase.
-- Crée un bucket public "newsletter-images" avec des policies RLS qui
-- permettent aux users approuvés d'uploader, et à tout le monde de lire
-- (nécessaire pour que les emails affichent les images).

-- 1. Crée le bucket (public)
insert into storage.buckets (id, name, public)
values ('newsletter-images', 'newsletter-images', true)
on conflict (id) do nothing;

-- Capacité totale prévue pour ce bucket : 1 Go.
-- Supabase Storage expose ici une limite par fichier ; on la laisse à 1 Go
-- pour ne pas bloquer le bucket côté infra, et l'app impose 5 Mo par image.
update storage.buckets
set file_size_limit = 1073741824
where id = 'newsletter-images';

-- 2. Lecture publique (tout le monde peut afficher les images dans un email)
drop policy if exists "newsletter_images_public_read" on storage.objects;
create policy "newsletter_images_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'newsletter-images');

-- 3. Upload réservé aux users authentifiés et approuvés
drop policy if exists "newsletter_images_upload_approved" on storage.objects;
create policy "newsletter_images_upload_approved"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'newsletter-images'
    and public.current_user_is_approved()
  );

-- 4. Suppression : seul l'auteur peut supprimer ses propres images
-- (le chemin commence par son user_id : "<uuid>/timestamp-name.ext")
drop policy if exists "newsletter_images_delete_own" on storage.objects;
create policy "newsletter_images_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'newsletter-images'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.current_user_is_admin()
    )
  );

-- 5. Update (rename, metadata) : seul l'auteur ou admin
drop policy if exists "newsletter_images_update_own" on storage.objects;
create policy "newsletter_images_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'newsletter-images'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.current_user_is_admin()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Bucket public pour previews HTML hébergées
-- ─────────────────────────────────────────────────────────────────────────────
-- Les previews sont publiées sous "<user_id>/<newsletter_id>/<timestamp-slug>.html".
-- On utilise des chemins versionnés pour éviter les délais de propagation CDN
-- liés aux overwrites.

insert into storage.buckets (id, name, public)
values ('newsletter-previews', 'newsletter-previews', true)
on conflict (id) do nothing;

update storage.buckets
set
  file_size_limit = 2097152,
  allowed_mime_types = array['text/html']
where id = 'newsletter-previews';

drop policy if exists "newsletter_previews_public_read" on storage.objects;
create policy "newsletter_previews_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'newsletter-previews');

drop policy if exists "newsletter_previews_upload_approved" on storage.objects;
create policy "newsletter_previews_upload_approved"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'newsletter-previews'
    and public.current_user_is_approved()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "newsletter_previews_delete_own" on storage.objects;
create policy "newsletter_previews_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'newsletter-previews'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.current_user_is_admin()
    )
  );
