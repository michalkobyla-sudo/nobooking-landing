-- Synchronizacja kalendarzy z Booking.com i Airbnb (iCal).
--
-- calendar_feeds          — linki eksportu iCal, które właściciel wkleił z portali.
-- external_blocked_dates  — dni zajęte na portalach, odświeżane przez cron
--                           /api/cron/sync-calendars co 15 minut.
--
-- Zajęte dni z portali trzymamy osobno, a nie w blocked_dates: tamte właściciel
-- klika ręcznie i sam odblokowuje, te nadpisuje cron przy każdym pobraniu.
-- Wspólna tabela kazałaby cronowi zgadywać, której blokady nie wolno ruszyć.
--
-- Uruchomienie: Supabase → SQL Editor → wklej całość → Run. Bezpieczne
-- do powtórzenia (if not exists).

create table if not exists calendar_feeds (
  id              uuid primary key default gen_random_uuid(),
  site_id         uuid not null references sites(id) on delete cascade,
  source          text not null check (source in ('booking', 'airbnb', 'inne')),
  url             text not null,
  last_synced_at  timestamptz,
  last_error      text,
  last_days_count integer,
  created_at      timestamptz not null default now(),
  unique (site_id, url)
);

create index if not exists calendar_feeds_site_idx on calendar_feeds (site_id);

alter table calendar_feeds enable row level security;
drop policy if exists "no_anon_calendar_feeds" on calendar_feeds;
create policy "no_anon_calendar_feeds" on calendar_feeds for all to anon using (false);

create table if not exists external_blocked_dates (
  id       uuid primary key default gen_random_uuid(),
  site_id  uuid not null references sites(id) on delete cascade,
  feed_id  uuid not null references calendar_feeds(id) on delete cascade,
  date     date not null,
  unique (feed_id, date)
);

create index if not exists external_blocked_dates_site_date_idx on external_blocked_dates (site_id, date);

alter table external_blocked_dates enable row level security;
drop policy if exists "no_anon_external_blocked" on external_blocked_dates;
create policy "no_anon_external_blocked" on external_blocked_dates for all to anon using (false);
