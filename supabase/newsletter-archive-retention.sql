-- Archivage temporaire des newsletters avant suppression définitive.
-- Une campagne archivée est conservée 30 jours, puis supprimée par le cron Vercel.

alter table public.newsletters
  add column if not exists archived_at timestamptz;

alter table public.newsletters
  add column if not exists archive_expires_at timestamptz;

alter table public.newsletters
  add column if not exists archived_by uuid references public.profiles(id) on delete set null;

update public.newsletters
set
  archived_at = coalesce(archived_at, updated_at, now()),
  archive_expires_at = coalesce(archive_expires_at, coalesce(archived_at, updated_at, now()) + interval '30 days')
where archived = true
  and (archived_at is null or archive_expires_at is null);

create index if not exists newsletters_archive_expires_at_idx
  on public.newsletters (archive_expires_at)
  where archived = true;
