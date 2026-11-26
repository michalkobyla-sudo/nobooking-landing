-- Darmowe demo na apartamencie klienta (2026-11-26).
--
-- Klient bez placenia podaje kilka danych, generator buduje strone, a klient
-- dostaje link /podglad/<token>. Kod: src/lib/demoZgloszenie.ts,
-- src/lib/demoGeneracja.ts, src/app/api/demo/route.ts.
--
-- Uruchomic w edytorze SQL Supabase (projekt nobooking-prod). Bez tej tabeli
-- formularz demo zwraca blad, a raport zdrowia zglasza brak.

create table if not exists public.demo_requests (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  token              text not null unique,

  first_name         text not null,
  email              text not null,
  apartment_name     text not null,
  apartment_location text not null,
  description        text,
  price_per_night    integer,
  currency           text not null default 'pln' check (currency in ('pln', 'eur')),
  max_guests         integer,
  bedrooms           integer,
  offer_link         text,

  -- new -> generating -> ready | failed (ponowienia z crona provision-sites)
  status             text not null default 'new'
                     check (status in ('new', 'generating', 'ready', 'failed')),
  attempts           integer not null default 0,
  started_at         timestamptz,
  generated_at       timestamptz,
  config             jsonb,
  error              text,

  -- Zakup z demo: ustawia /api/orders, gdy klient zamowi z podgladu.
  order_id           uuid references public.orders(id) on delete set null,

  -- Zrodlo wejscia, jak w orders (lib/attribution.ts).
  utm_source   text,
  utm_medium   text,
  utm_campaign text,
  utm_content  text,
  utm_term     text,
  click_id     text,
  referrer     text,
  landing_path text
);

comment on table public.demo_requests is
  'Darmowe demo bez zakupu. Wiersze bez order_id starsze niz 180 dni usuwa cron cleanup-pending-bookings (polityka prywatnosci, pkt 9).';

create index if not exists demo_requests_created_at_idx on public.demo_requests (created_at);
create index if not exists demo_requests_email_idx on public.demo_requests (email);

-- Tylko klucz serwisowy (trasy serwerowe). Brak polityk = brak dostepu z kluczem anonimowym.
alter table public.demo_requests enable row level security;

-- Sprawdzenie:
-- select count(*) from public.demo_requests;
