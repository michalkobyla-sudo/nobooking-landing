-- ============================================================
-- nobooking.eu — Supabase schema
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ─── ORDERS ──────────────────────────────────────────────────────────────────

create table if not exists orders (
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

-- Indexes
create index if not exists orders_status_idx       on orders (status);
create index if not exists orders_email_idx        on orders (email);
create index if not exists orders_onboarding_token on orders (onboarding_token);
create index if not exists orders_site_slug        on orders (site_slug);
create index if not exists orders_created_at_idx   on orders (created_at desc);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────────────────────
-- All reads/writes go through service_role key (API routes) — no anon access

alter table orders enable row level security;

-- Block all anon access (API routes use service_role which bypasses RLS)
create policy "no_anon_access" on orders
  for all
  to anon
  using (false);

-- ─── DONE ─────────────────────────────────────────────────────────────────────
-- After running, verify with:
-- select count(*) from orders;
