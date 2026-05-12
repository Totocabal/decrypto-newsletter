-- ─────────────────────────────────────────────────────────────────────────────
-- Décrypto Newsletter — Schéma Supabase
-- ─────────────────────────────────────────────────────────────────────────────
-- À exécuter dans le SQL Editor de Supabase (https://supabase.com → ton projet → SQL Editor).
-- Crée toutes les tables + politiques de sécurité (RLS) + fonctions + triggers.

-- ── Extensions ─────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles : métadonnées utilisateur + flag d'approbation manuelle
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  email text not null,
  approved boolean not null default false,
  is_admin boolean not null default false,
  password_set boolean not null default false,
  created_at timestamptz not null default now()
);

-- Trigger : à l'inscription, on crée automatiquement un profil non approuvé
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- newsletters : une édition = une newsletter
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.newsletters (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  issue_number text,
  -- État courant (auto-save) : tout le brouillon JSON
  current_state jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  archived boolean not null default false
);

create index if not exists newsletters_updated_at_idx
  on public.newsletters (updated_at desc);
create index if not exists newsletters_archived_idx
  on public.newsletters (archived);

-- ─────────────────────────────────────────────────────────────────────────────
-- versions : snapshots horodatés (créés à chaque "Sauvegarder" explicite)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.versions (
  id uuid primary key default gen_random_uuid(),
  newsletter_id uuid not null references public.newsletters(id) on delete cascade,
  state jsonb not null,
  author_id uuid references public.profiles(id) on delete set null,
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists versions_newsletter_idx
  on public.versions (newsletter_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- locks : verrou d'édition par newsletter (au plus un éditeur à la fois)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.locks (
  newsletter_id uuid primary key references public.newsletters(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  acquired_at timestamptz not null default now(),
  expires_at timestamptz not null,
  user_full_name text,
  user_email text
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Fonctions utilitaires (SECURITY DEFINER → bypass RLS pour éviter la récursion)
-- ─────────────────────────────────────────────────────────────────────────────
-- Ces fonctions sont utilisées dans les policies RLS plus bas. En faisant
-- SECURITY DEFINER + search_path verrouillé, elles ne déclenchent pas leur
-- propre RLS quand elles lisent la table profiles → pas de récursion infinie.

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

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS — politiques de sécurité
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.newsletters enable row level security;
alter table public.versions enable row level security;
alter table public.locks enable row level security;

-- ── profiles ──
-- Lecture : tout user authentifié voit tous les profils (pour afficher noms
-- et avatars dans l'historique des versions)
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all"
  on public.profiles for select
  to authenticated
  using (true);

-- Update : l'user peut éditer son propre profil (mais pas son flag is_admin),
-- OU n'importe quel profil s'il est admin
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_admin_all" on public.profiles;
drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
  on public.profiles for update
  to authenticated
  using (
    id = auth.uid()
    or public.current_user_is_admin()
  )
  with check (
    -- Soit c'est son propre profil et il ne change pas son flag is_admin
    (
      id = auth.uid()
      and is_admin = (
        select p.is_admin from public.profiles p where p.id = auth.uid()
      )
    )
    -- Soit c'est un admin qui édite (et peut tout modifier, y compris is_admin)
    or public.current_user_is_admin()
  );

-- Delete : admin uniquement
drop policy if exists "profiles_delete_admin" on public.profiles;
create policy "profiles_delete_admin"
  on public.profiles for delete
  to authenticated
  using (public.current_user_is_admin());

-- Insert : géré exclusivement par le trigger handle_new_user (security definer).
-- Pas de policy insert pour les clients → impossibles de créer un profil
-- arbitraire depuis le front.

-- ── newsletters ── seuls les users approuvés voient/écrivent
drop policy if exists "newsletters_select_approved" on public.newsletters;
create policy "newsletters_select_approved"
  on public.newsletters for select
  to authenticated
  using (public.current_user_is_approved());

drop policy if exists "newsletters_insert_approved" on public.newsletters;
create policy "newsletters_insert_approved"
  on public.newsletters for insert
  to authenticated
  with check (public.current_user_is_approved());

drop policy if exists "newsletters_update_approved" on public.newsletters;
create policy "newsletters_update_approved"
  on public.newsletters for update
  to authenticated
  using (public.current_user_is_approved())
  with check (public.current_user_is_approved());

drop policy if exists "newsletters_delete_admin" on public.newsletters;
create policy "newsletters_delete_admin"
  on public.newsletters for delete
  to authenticated
  using (public.current_user_is_admin());

-- ── versions ── lecture pour tous les approuvés, insertion seulement de
-- ses propres versions
drop policy if exists "versions_select_approved" on public.versions;
create policy "versions_select_approved"
  on public.versions for select
  to authenticated
  using (public.current_user_is_approved());

drop policy if exists "versions_insert_approved" on public.versions;
create policy "versions_insert_approved"
  on public.versions for insert
  to authenticated
  with check (
    public.current_user_is_approved()
    and author_id = auth.uid()
  );

-- ── locks ── tout user approuvé lit, chacun ne pose/MAJ que son propre lock
drop policy if exists "locks_select_approved" on public.locks;
create policy "locks_select_approved"
  on public.locks for select
  to authenticated
  using (public.current_user_is_approved());

drop policy if exists "locks_insert_own" on public.locks;
create policy "locks_insert_own"
  on public.locks for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.current_user_is_approved()
  );

drop policy if exists "locks_update_own" on public.locks;
create policy "locks_update_own"
  on public.locks for update
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "locks_delete_own_or_expired" on public.locks;
create policy "locks_delete_own_or_expired"
  on public.locks for delete
  to authenticated
  using (
    user_id = auth.uid()
    or expires_at < now()
    or public.current_user_is_admin()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC : acquire_lock — pose / renouvelle un verrou avec gestion atomique
-- ─────────────────────────────────────────────────────────────────────────────
-- Logique :
--   - si pas de lock existant → on en crée un (10 min)
--   - si lock existant et c'est le mien → renouvelle (10 min)
--   - si lock existant et expiré → on le remplace
--   - si lock existant, pas le mien, valide → renvoie l'info (le client affichera le bandeau)
create or replace function public.acquire_lock(
  p_newsletter_id uuid,
  p_force boolean default false
)
returns public.locks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing public.locks;
  v_profile public.profiles;
begin
  -- Vérifier que l'user est approuvé
  select * into v_profile from public.profiles where id = v_user_id;
  if v_profile is null or v_profile.approved = false then
    raise exception 'Compte non approuvé';
  end if;

  -- Tente de récupérer le lock courant
  select * into v_existing from public.locks where newsletter_id = p_newsletter_id;

  if v_existing is null
     or v_existing.expires_at < now()
     or v_existing.user_id = v_user_id
     or p_force = true then
    -- Soit il n'y a pas de lock, soit il est expiré, soit c'est le mien, soit on force
    insert into public.locks (newsletter_id, user_id, expires_at, user_full_name, user_email)
    values (
      p_newsletter_id,
      v_user_id,
      now() + interval '10 minutes',
      v_profile.full_name,
      v_profile.email
    )
    on conflict (newsletter_id) do update
    set user_id = excluded.user_id,
        acquired_at = case
          when public.locks.user_id = excluded.user_id then public.locks.acquired_at
          else now()
        end,
        expires_at = excluded.expires_at,
        user_full_name = excluded.user_full_name,
        user_email = excluded.user_email
    returning * into v_existing;
  end if;

  return v_existing;
end;
$$;

grant execute on function public.acquire_lock(uuid, boolean) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC : release_lock — libère le verrou si c'est le mien
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.release_lock(p_newsletter_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.locks
   where newsletter_id = p_newsletter_id
     and user_id = auth.uid();
end;
$$;

grant execute on function public.release_lock(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC : admin_create_user — crée un compte depuis l'interface admin
-- ─────────────────────────────────────────────────────────────────────────────
-- Crée un utilisateur Auth confirmé sans envoyer d'email Supabase. L'admin
-- transmet le mot de passe temporaire, que l'utilisateur peut changer ensuite.
create or replace function public.admin_create_user(
  p_email text,
  p_password text,
  p_full_name text default null,
  p_approved boolean default true,
  p_is_admin boolean default false
)
returns public.profiles
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_email text := lower(trim(p_email));
  v_full_name text := nullif(trim(coalesce(p_full_name, '')), '');
  v_user_id uuid;
  v_profile public.profiles;
begin
  if not public.current_user_is_admin() then
    raise exception 'Accès réservé aux administrateurs';
  end if;

  if v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception 'Email invalide';
  end if;

  if length(coalesce(p_password, '')) < 8 then
    raise exception 'Le mot de passe temporaire doit contenir au moins 8 caractères';
  end if;

  select id into v_user_id
  from auth.users
  where lower(email) = v_email
  limit 1;

  if v_user_id is null then
    v_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      crypt(p_password, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', coalesce(v_full_name, split_part(v_email, '@', 1))),
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  end if;

  insert into public.profiles (
    id,
    email,
    full_name,
    approved,
    is_admin,
    password_set
  )
  values (
    v_user_id,
    v_email,
    coalesce(v_full_name, split_part(v_email, '@', 1)),
    p_approved,
    p_is_admin,
    false
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(excluded.full_name, public.profiles.full_name),
      approved = excluded.approved,
      is_admin = excluded.is_admin,
      password_set = false
  returning * into v_profile;

  return v_profile;
end;
$$;

grant execute on function public.admin_create_user(text, text, text, boolean, boolean)
  to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Trigger : touch updated_at à chaque update sur newsletters
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists newsletters_touch on public.newsletters;
create trigger newsletters_touch
  before update on public.newsletters
  for each row execute function public.touch_updated_at();
