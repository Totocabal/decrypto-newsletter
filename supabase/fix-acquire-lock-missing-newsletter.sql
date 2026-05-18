-- Fix: make acquire_lock fail with a readable message when the newsletter no longer exists.

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
  v_newsletter_exists boolean;
begin
  select * into v_profile from public.profiles where id = v_user_id;
  if v_profile is null or v_profile.approved = false then
    raise exception 'Compte non approuvé';
  end if;

  select exists (
    select 1 from public.newsletters where id = p_newsletter_id
  ) into v_newsletter_exists;
  if v_newsletter_exists = false then
    raise exception 'Newsletter introuvable ou supprimée';
  end if;

  select * into v_existing from public.locks where newsletter_id = p_newsletter_id;

  if v_existing is null
     or v_existing.expires_at < now()
     or v_existing.user_id = v_user_id
     or p_force = true then
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
