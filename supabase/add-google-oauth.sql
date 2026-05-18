-- Migration: add auth_provider column and update trigger for Google OAuth
-- Run this in the Supabase SQL Editor for existing installs.

alter table public.profiles add column if not exists auth_provider text not null default 'email';

-- Update handle_new_user to detect provider and populate auth_provider / password_set
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
  v_provider text;
  v_is_email_provider boolean;
begin
  v_provider := coalesce(new.raw_app_meta_data->>'provider', 'email');
  v_is_email_provider := v_provider = 'email';

  insert into public.profiles (id, email, full_name, avatar_url, password_set, auth_provider)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    ),
    not v_is_email_provider,
    v_provider
  );
  return new;
end;
$$;
