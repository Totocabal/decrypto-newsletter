-- ─────────────────────────────────────────────────────────────────────────────
-- Migration : presets de templates newsletter partagés
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.template_presets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sections jsonb not null default '[]'::jsonb,
  include_default_content boolean not null default true,
  show_section_numbers boolean not null default true,
  show_block_separators boolean not null default true,
  theme_variant text not null default 'dark' check (theme_variant in ('dark', 'light')),
  show_issue_date boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null
);

alter table public.template_presets
  add column if not exists updated_by uuid references public.profiles(id) on delete set null;

alter table public.template_presets
  alter column created_by set default auth.uid();

alter table public.template_presets
  add column if not exists show_section_numbers boolean not null default true;

alter table public.template_presets
  add column if not exists show_block_separators boolean not null default true;

alter table public.template_presets
  add column if not exists theme_variant text not null default 'dark';

alter table public.template_presets
  add column if not exists show_issue_date boolean not null default true;

alter table public.template_presets
  drop constraint if exists template_presets_theme_variant_check;

alter table public.template_presets
  add constraint template_presets_theme_variant_check
  check (theme_variant in ('dark', 'light'));

create index if not exists template_presets_name_idx
  on public.template_presets (lower(name));

alter table public.template_presets enable row level security;

drop policy if exists "template_presets_select_approved" on public.template_presets;
create policy "template_presets_select_approved"
  on public.template_presets for select
  to authenticated
  using (public.current_user_is_approved());

drop policy if exists "template_presets_insert_admin" on public.template_presets;
create policy "template_presets_insert_admin"
  on public.template_presets for insert
  to authenticated
  with check (public.current_user_is_admin());

drop policy if exists "template_presets_update_admin" on public.template_presets;
create policy "template_presets_update_admin"
  on public.template_presets for update
  to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

drop policy if exists "template_presets_delete_admin" on public.template_presets;
drop policy if exists "template_presets_delete_owner_or_admin" on public.template_presets;
create policy "template_presets_delete_owner_or_admin"
  on public.template_presets for delete
  to authenticated
  using (
    public.current_user_is_admin()
    or created_by = auth.uid()
  );

drop trigger if exists template_presets_touch on public.template_presets;
create trigger template_presets_touch
  before update on public.template_presets
  for each row execute function public.touch_updated_at();
