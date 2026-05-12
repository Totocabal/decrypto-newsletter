-- ─────────────────────────────────────────────────────────────────────────────
-- Migration : ajoute un flag pour savoir si l'utilisateur a défini un mot de
-- passe au-delà du magic link initial.
-- ─────────────────────────────────────────────────────────────────────────────
-- À exécuter une fois dans le SQL Editor de Supabase.

alter table public.profiles
  add column if not exists password_set boolean not null default false;

-- Pour les comptes existants qui ont peut-être déjà défini un mot de passe
-- (via réinitialisation côté Supabase, ou autre), on les laisse à false.
-- Ils verront simplement l'onboarding "Définir un mot de passe" à leur
-- prochaine connexion par magic link, ce qui est inoffensif.
