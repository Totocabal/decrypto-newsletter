-- ─────────────────────────────────────────────────────────────────────────────
-- Logs de connexion + dernière connexion par profil
-- À exécuter dans le SQL Editor Supabase.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists last_login_at timestamptz;

create table if not exists public.login_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  email text,
  full_name text,
  auth_provider text,
  user_agent text,
  logged_at timestamptz not null default now()
);

create index if not exists login_logs_user_id_logged_at_idx
  on public.login_logs (user_id, logged_at desc);

create index if not exists profiles_last_login_at_idx
  on public.profiles (last_login_at desc);

alter table public.login_logs enable row level security;

drop policy if exists "login_logs_insert_own" on public.login_logs;
create policy "login_logs_insert_own"
  on public.login_logs for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "login_logs_select_own_or_admin" on public.login_logs;
create policy "login_logs_select_own_or_admin"
  on public.login_logs for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.current_user_is_admin()
  );

grant select, insert on public.login_logs to authenticated;
grant update (last_login_at) on public.profiles to authenticated;
