-- ─────────────────────────────────────────────────────────────────────────────
-- Migration : statistiques d'usage des blocs (tri du sélecteur « Ajouter un bloc »)
-- ─────────────────────────────────────────────────────────────────────────────
-- Renvoie, pour chaque type de bloc, le nombre de blocs et de newsletters actives
-- (non archivées) qui l'utilisent. Seuls des totaux sont exposés, jamais de contenu ;
-- la fonction est en security definer pour compter toutes les newsletters, quel que soit
-- l'auteur, et ne répond qu'aux comptes approuvés.

create or replace function public.block_usage()
returns table (type text, uses bigint, newsletters bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    s->>'type' as type,
    count(*) as uses,
    count(distinct n.id) as newsletters
  from public.newsletters n
  cross join lateral jsonb_array_elements(coalesce(n.current_state->'sections', '[]'::jsonb)) s
  where not coalesce(n.archived, false)
    and public.current_user_is_approved()
    and s->>'type' is not null
  group by s->>'type'
$$;

revoke all on function public.block_usage() from public;
revoke execute on function public.block_usage() from anon;
grant execute on function public.block_usage() to authenticated;
