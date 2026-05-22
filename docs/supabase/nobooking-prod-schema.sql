-- ============================================================
-- nobooking.eu — Clean Production Schema
-- New Supabase project: nobooking-prod
--
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
--
-- This schema is CLEAN — no CasaSol compatibility hacks.
-- NOT NULL constraints are properly enforced.
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ─── ORDERS ──────────────────────────────────────────────────────────────────

create table orders (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),

  -- Plan & payment
  plan                  text not null check (plan in ('basic', 'pro')),
  currency              text not null check (currency in ('pln', 'eur')),
  status                text not null default 'new'
                          check (status in ('new','contacted','onboarding_sent','building','completed')),
  stripe_session_id     text,
  stripe_paid           boolean not null default false,

  -- Onboarding token (UUID sent to client via email)
  onboarding_token      uuid not null default gen_random_uuid(),
  onboarding_submitted  boolean not null default false,

  -- Client data (from order form)
  first_name            text not null,
  last_name             text not null,
  email                 text not null,
  phone                 text not null,
  invoice_company       text,
  invoice_nip           text,
  invoice_address       text,

  -- Apartment basics (from order form)
  apartment_name        text not null,
  apartment_location    text not null,
  notes                 text,

  -- ── Onboarding — opis i specyfikacja ──────────────────────────────────────
  ob_description        text,
  ob_tagline            text,
  ob_address            text,
  ob_bedrooms           int,
  ob_bathrooms          int,
  ob_sqm                int,

  -- ── Onboarding — media ────────────────────────────────────────────────────
  ob_photos_link        text,
  ob_video_link         text,

  -- ── Onboarding — cennik ───────────────────────────────────────────────────
  ob_price_per_night    numeric,
  ob_currency           text check (ob_currency in ('pln', 'eur')),
  ob_max_guests         int,
  ob_seasons            text,   -- JSON: Season[]

  -- ── Onboarding — zasady ───────────────────────────────────────────────────
  ob_checkin_time       text,
  ob_checkout_time      text,
  ob_amenities          text,
  ob_rules              text,

  -- ── Onboarding — kontakt i domena ─────────────────────────────────────────
  ob_contact_email      text,
  ob_contact_phone      text,
  ob_domain             text,
  ob_instagram          text,
  ob_facebook           text,
  ob_color              text,

  -- ── Onboarding — tylko Pro ────────────────────────────────────────────────
  ob_sms_phone          text,
  ob_checkin_fields     text,   -- JSON

  -- ── Wygenerowana strona ───────────────────────────────────────────────────
  site_slug             text unique,
  generated_config      text,   -- JSON: ApartmentConfig
  site_generated_at     timestamptz
);

create index orders_status_idx       on orders (status);
create index orders_email_idx        on orders (email);
create index orders_onboarding_token on orders (onboarding_token);
create index orders_site_slug        on orders (site_slug);
create index orders_created_at_idx   on orders (created_at desc);

alter table orders enable row level security;
create policy "no_anon_access" on orders for all to anon using (false);

-- ─── SITES ───────────────────────────────────────────────────────────────────

create table sites (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  order_id            uuid not null references orders(id) on delete cascade,
  slug                text not null unique,
  plan                text not null check (plan in ('basic', 'pro')),
  active              boolean not null default true,
  config              jsonb not null default '{}',
  owner_email         text not null,
  owner_user_id       uuid,
  stripe_account_id   text,
  stripe_onboarded    boolean not null default false,
  admin_password_hash text
);

create index sites_slug_idx     on sites (slug);
create index sites_order_id_idx on sites (order_id);

alter table sites enable row level security;
create policy "no_anon_sites" on sites for all to anon using (false);

-- ─── BOOKINGS ────────────────────────────────────────────────────────────────

create table bookings (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  site_id           uuid not null references sites(id) on delete cascade,  -- NOT NULL (clean)
  guest_name        text not null,                                          -- NOT NULL (clean)
  guest_email       text not null,                                          -- NOT NULL (clean)
  guest_phone       text not null,                                          -- NOT NULL (clean)
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
  site_id   uuid not null references sites(id) on delete cascade,  -- NOT NULL (clean)
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

-- ─── RPC FUNCTIONS ───────────────────────────────────────────────────────────

create or replace function increment_discount_usage(
  p_site_id uuid,
  p_code    text
)
returns void
language sql
security definer
as $$
  update discount_codes
  set uses_count = uses_count + 1
  where site_id = p_site_id
    and code = p_code;
$$;

-- ─── VERIFY ──────────────────────────────────────────────────────────────────

select table_name from information_schema.tables
where table_schema = 'public'
order by table_name;
-- Expected: blocked_dates, bookings, checkin_forms, discount_codes, orders, reviews, sites
