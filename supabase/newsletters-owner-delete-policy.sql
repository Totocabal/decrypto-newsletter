-- Permet au créateur d'un template/newsletter de le supprimer.
-- Les admins gardent le droit de supprimer tous les templates/newsletters.

alter table public.newsletters
  alter column created_by set default auth.uid();

drop policy if exists "newsletters_delete_admin" on public.newsletters;
drop policy if exists "newsletters_delete_owner_or_admin" on public.newsletters;

create policy "newsletters_delete_owner_or_admin"
  on public.newsletters for delete
  to authenticated
  using (
    public.current_user_is_admin()
    or created_by = auth.uid()
  );
