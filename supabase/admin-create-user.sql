-- ─────────────────────────────────────────────────────────────────────────────
-- Migration : création de comptes depuis l'interface admin
-- ─────────────────────────────────────────────────────────────────────────────
-- À exécuter dans le SQL Editor de Supabase.
-- Permet à un admin approuvé de créer un utilisateur Auth confirmé, sans
-- envoyer d'email Supabase. L'admin transmet ensuite le mot de passe temporaire.

create extension if not exists "pgcrypto" with schema extensions;

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
