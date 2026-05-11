-- ============================================================
-- nobooking.eu — Booking System Schema
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run — drops conflicting tables first
-- ============================================================

-- Drop in reverse dependency order (if exist)
drop table if exists checkin_forms cascade;
drop table if exists discount_codes cascade;
drop table if exists reviews cascade;
drop table if exists blocked_dates cascade;
drop table if exists bookings cascade;
drop table if exists sites cascade;

-- ─── SITES ───────────────────────────────────────────────────────────────────
create table sites (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  order_id          uuid not null references orders(id) on delete cascade,
  slug              text not null unique,
  plan              text not null check (plan in ('basic', 'pro')),
  active            boolean not null default true,
  config            jsonb not null default '{}',
  owner_email       text not null,
  owner_user_id     uuid,
  stripe_account_id text,
  stripe_onboarded  boolean not null default false
);

create index sites_slug_idx     on sites (slug);
create index sites_order_id_idx on sites (order_id);

alter table sites enable row level security;
create policy "no_anon_sites" on sites for all to anon using (false);

-- ─── BOOKINGS ────────────────────────────────────────────────────────────────
create table bookings (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  site_id           uuid not null references sites(id) on delete cascade,
  guest_name        text not null,
  guest_email       text not null,
  guest_phone       text not null,
  check_in          date not null,
  check_out         date not null,
  nights            int not null,
  guests_count      int not null default 1,
  total_price       numeric not null,
  currency          text not null default 'EUR',
  stripe_session_id text,
  stripe_payment_id text,
  stripe_paid       boolean not null default false,
  status            text not null default 'pending'
                      check (status in ('pending','confirmed','cancelled','completed')),
  token             uuid not null default gen_random_uuid(),
  discount_code     text,
  discount_pct      int default 0,
  notes             text,
  checkin_sent      boolean not null default false,
  checkin_submitted boolean not null default false
);

create index bookings_site_id_idx  on bookings (site_id);
create index bookings_check_in_idx on bookings (check_in);
create index bookings_token_idx    on bookings (token);
create index bookings_status_idx   on bookings (status);

alter table bookings enable row level security;
create policy "no_anon_bookings" on bookings for all to anon using (false);

-- ─── BLOCKED DATES ───────────────────────────────────────────────────────────
create table blocked_dates (
  id        uuid primary key default gen_random_uuid(),
  site_id   uuid not null references sites(id) on delete cascade,
  date      date not null,
  reason    text,
  unique (site_id, date)
);

create index blocked_dates_site_idx on blocked_dates (site_id);

alter table blocked_dates enable row level security;
create policy "no_anon_blocked" on blocked_dates for all to anon using (false);

-- ─── REVIEWS ─────────────────────────────────────────────────────────────────
create table reviews (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  site_id     uuid not null references sites(id) on delete cascade,
  booking_id  uuid references bookings(id),
  guest_name  text not null,
  score       int not null check (score between 1 and 5),
  text        text not null,
  published   boolean not null default false
);

create index reviews_site_id_idx on reviews (site_id, published);

alter table reviews enable row level security;
create policy "no_anon_reviews" on reviews for all to anon using (false);

-- ─── DISCOUNT CODES (Pro only) ───────────────────────────────────────────────
create table discount_codes (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  site_id      uuid not null references sites(id) on delete cascade,
  code         text not null,
  discount_pct int not null check (discount_pct between 1 and 100),
  max_uses     int,
  uses_count   int not null default 0,
  valid_until  date,
  active       boolean not null default true,
  unique (site_id, code)
);

alter table discount_codes enable row level security;
create policy "no_anon_codes" on discount_codes for all to anon using (false);

-- ─── CHECKIN FORMS (Pro only) ────────────────────────────────────────────────
create table checkin_forms (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  booking_id   uuid not null references bookings(id) on delete cascade unique,
  guests_data  jsonb not null default '[]',
  arrival_time text,
  notes        text
);

alter table checkin_forms enable row level security;
create policy "no_anon_checkin" on checkin_forms for all to anon using (false);

-- ─── VERIFY ──────────────────────────────────────────────────────────────────
select table_name from information_schema.tables
where table_schema = 'public'
order by table_name;
