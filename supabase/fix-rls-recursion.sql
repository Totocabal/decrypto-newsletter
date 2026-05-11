-- ─────────────────────────────────────────────────────────────────────────────
-- Migration : fix de la récursion infinie sur les policies de profiles
-- ─────────────────────────────────────────────────────────────────────────────
-- À exécuter UNE FOIS si tu as installé le schéma initial avant le 11 mai 2026.
-- Si tu installes maintenant depuis schema.sql, ce fix est déjà inclus, tu peux
-- ignorer ce fichier.
--
-- L'erreur que cela corrige :
--   "infinite recursion detected in policy for relation profiles"

-- 1. Fonctions utilitaires en SECURITY DEFINER (bypass RLS proprement)
create or replace function public.current_user_is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

grant execute on function public.current_user_is_admin() to authenticated;

create or replace function public.current_user_is_approved()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select approved from public.profiles where id = auth.uid()),
    false
  );
$$;

grant execute on function public.current_user_is_approved() to authenticated;

-- 2. Profiles : nouvelles policies sans auto-référence
drop policy if exists "profiles_select_all" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_admin_all" on public.profiles;
drop policy if exists "profiles_update_own_or_admin" on public.profiles;
drop policy if exists "profiles_delete_admin" on public.profiles;

create policy "profiles_select_all"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_update_own_or_admin"
  on public.profiles for update
  to authenticated
  using (
    id = auth.uid()
    or public.current_user_is_admin()
  )
  with check (
    (
      id = auth.uid()
      and is_admin = (
        select p.is_admin from public.profiles p where p.id = auth.uid()
      )
    )
    or public.current_user_is_admin()
  );

create policy "profiles_delete_admin"
  on public.profiles for delete
  to authenticated
  using (public.current_user_is_admin());

-- 3. Newsletters : remplace les policies
drop policy if exists "newsletters_select_approved" on public.newsletters;
drop policy if exists "newsletters_insert_approved" on public.newsletters;
drop policy if exists "newsletters_update_approved" on public.newsletters;
drop policy if exists "newsletters_delete_admin" on public.newsletters;

create policy "newsletters_select_approved"
  on public.newsletters for select
  to authenticated
  using (public.current_user_is_approved());

create policy "newsletters_insert_approved"
  on public.newsletters for insert
  to authenticated
  with check (public.current_user_is_approved());

create policy "newsletters_update_approved"
  on public.newsletters for update
  to authenticated
  using (public.current_user_is_approved())
  with check (public.current_user_is_approved());

create policy "newsletters_delete_admin"
  on public.newsletters for delete
  to authenticated
  using (public.current_user_is_admin());

-- 4. Versions
drop policy if exists "versions_select_approved" on public.versions;
drop policy if exists "versions_insert_approved" on public.versions;

create policy "versions_select_approved"
  on public.versions for select
  to authenticated
  using (public.current_user_is_approved());

create policy "versions_insert_approved"
  on public.versions for insert
  to authenticated
  with check (
    public.current_user_is_approved()
    and author_id = auth.uid()
  );

-- 5. Locks
drop policy if exists "locks_select_approved" on public.locks;
drop policy if exists "locks_insert_own" on public.locks;
drop policy if exists "locks_update_own" on public.locks;
drop policy if exists "locks_delete_own_or_expired" on public.locks;

create policy "locks_select_approved"
  on public.locks for select
  to authenticated
  using (public.current_user_is_approved());

create policy "locks_insert_own"
  on public.locks for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.current_user_is_approved()
  );

create policy "locks_update_own"
  on public.locks for update
  to authenticated
  using (user_id = auth.uid());

create policy "locks_delete_own_or_expired"
  on public.locks for delete
  to authenticated
  using (
    user_id = auth.uid()
    or expires_at < now()
    or public.current_user_is_admin()
  );
