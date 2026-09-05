-- ============================================================
-- nobooking.eu — Migracja P0 (audyt 2026-09-05)
-- Uruchom w: Supabase Dashboard → SQL Editor → New query → Run
--
-- Zawiera:
--   1. Constraint wykluczający podwójne rezerwacje  (audyt P1 #7)
--   2. Tabelę idempotencji zdarzeń Stripe            (audyt P0 #5, P1 #6)
--   3. Blokadę na równoległy provisioning            (audyt P1 #9)
--
-- KOLEJNOŚĆ MA ZNACZENIE: sekcja 1 najpierw uruchamia zapytanie
-- kontrolne. Jeśli zwróci wiersze — NIE dodawaj constraintu, dopóki
-- nie rozwiążesz nakładających się rezerwacji ręcznie.
-- ============================================================


-- ─── 1. Podwójne rezerwacje ──────────────────────────────────────────────────

-- 1a. KONTROLA PRZED MIGRACJĄ — uruchom osobno i sprawdź wynik.
--     Pusty wynik = można kontynuować.
--     Wiersze = istnieją już nakładające się rezerwacje; rozwiąż je najpierw,
--     bo ALTER TABLE poniżej się nie powiedzie.
SELECT
  a.site_id,
  a.id   AS booking_a, a.check_in AS a_in, a.check_out AS a_out, a.status AS a_status,
  b.id   AS booking_b, b.check_in AS b_in, b.check_out AS b_out, b.status AS b_status
FROM bookings a
JOIN bookings b
  ON a.site_id = b.site_id
 AND a.id < b.id
 AND daterange(a.check_in, a.check_out, '[)') && daterange(b.check_in, b.check_out, '[)')
WHERE a.status IN ('pending', 'confirmed')
  AND b.status IN ('pending', 'confirmed');


-- 1b. Constraint. Wymaga btree_gist, żeby porównywać uuid (=) obok zakresu (&&).
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    site_id                                     WITH =,
    daterange(check_in, check_out, '[)')        WITH &&
  )
  WHERE (status IN ('pending', 'confirmed'));

-- Od tej chwili baza sama odrzuca nakładającą się rezerwację — niezależnie
-- od tego, ile żądań przyjdzie równolegle. To jedyne miejsce, w którym da się
-- to zagwarantować; sprawdzenie w kodzie aplikacji zawsze ma okno wyścigu.


-- ─── 2. Idempotencja webhooków Stripe ────────────────────────────────────────

-- Stripe gwarantuje at-least-once delivery — powtórki są normalne, nie awaryjne.
-- Klucz główny na event_id sprawia, że drugie wstawienie tego samego zdarzenia
-- zwraca konflikt, zamiast przetworzyć je po raz drugi.
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id     text primary key,
  event_type   text not null,
  processed_at timestamptz not null default now()
);

ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no_anon_stripe_events" ON stripe_webhook_events FOR ALL TO anon USING (false);

-- Porządki: zdarzenia starsze niż 90 dni nie są już do niczego potrzebne.
CREATE INDEX IF NOT EXISTS stripe_webhook_events_processed_idx
  ON stripe_webhook_events (processed_at);


-- ─── 3. Blokada provisioningu ────────────────────────────────────────────────

-- Cron chodzi co minutę, a provisioning zawiera wywołanie LLM i potrafi trwać
-- dłużej. Bez tej kolumny kolejne uruchomienie widzi to samo zamówienie
-- (site_slug wciąż NULL) i tworzy drugie konto Auth oraz drugie konto Stripe.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS provisioning_started_at timestamptz;

CREATE INDEX IF NOT EXISTS orders_provisioning_idx
  ON orders (onboarding_submitted, site_slug, provisioning_started_at);


-- ─── WERYFIKACJA ─────────────────────────────────────────────────────────────

-- Constraint istnieje?
SELECT conname, pg_get_constraintdef(oid) AS definicja
FROM pg_constraint
WHERE conname = 'bookings_no_overlap';

-- Tabela zdarzeń istnieje?
SELECT table_name FROM information_schema.tables
WHERE table_name = 'stripe_webhook_events';

-- Kolumna blokady istnieje?
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'provisioning_started_at';
