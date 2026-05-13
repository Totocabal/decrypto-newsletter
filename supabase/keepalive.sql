-- Keepalive RPC pour éviter la mise en pause automatique des projets Free.
-- À exécuter une fois dans Supabase SQL Editor.

create or replace function public.keepalive()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'ok', true,
    'checked_at', now()
  );
$$;

grant execute on function public.keepalive() to anon, authenticated;
