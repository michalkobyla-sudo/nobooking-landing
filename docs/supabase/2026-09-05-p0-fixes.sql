-- ============================================================
-- nobooking.eu — Migracja P0 (audyt 2026-09-05)
-- Uruchom w: Supabase Dashboard → SQL Editor → New query → Run
--
-- Zawiera:
--   1. Constraint wykluczający podwójne rezerwacje  (audyt P1 #7)
--   2. Tabelę idempotencji zdarzeń Stripe            (audyt P0 #5, P1 #6)
--   3. Blokadę na równoległy provisioning            (audyt P1 #9)
--
-- KOLEJNOŚĆ MA ZNACZENIE: sekcja 1 najpierw uruchamia dwa zapytania
-- kontrolne. Jeśli którekolwiek zwróci wiersze — NIE dodawaj constraintu,
-- dopóki nie rozwiążesz problemu ręcznie.
--
-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  ⚠️  SPRAWDŹ, W KTÓRYM PROJEKCIE JESTEŚ, ZANIM URUCHOMISZ            ║
-- ║                                                                      ║
-- ║  Ta migracja należy do NOBOOKING-PROD: cgsfhvgddtwppmqvdecz          ║
-- ║  NIE do projektu casa-sol: ejteazvuaufaltmhcrwi                      ║
-- ║                                                                      ║
-- ║  Weryfikacja 2026-09-05: produkcja nobooking.eu czyta INNY projekt   ║
-- ║  Supabase niż ten wskazany w .env.local. Kalendarz casa-sol na       ║
-- ║  produkcji nobookinga zwraca 111 dat (do 2026-10-25), a wspólna      ║
-- ║  baza ejteazvuaufaltmhcrwi dałaby 107 (do 2026-09-23).               ║
-- ║  Plik .env.local jest nieaktualny — nie sugeruj się nim.             ║
-- ║                                                                      ║
-- ║  Uruchomienie tego skryptu na projekcie casa-sol dołoży constrainty  ║
-- ║  do bazy działającej strony z prawdziwymi rezerwacjami gości.        ║
-- ║                                                                      ║
-- ║  Sprawdź adres projektu w Supabase Dashboard i porównaj z tym,       ║
-- ║  co ma Vercel → nobooking-landing → Environment Variables.           ║
-- ╚══════════════════════════════════════════════════════════════════════╝
--
-- Poniższe uwagi opisują sytuację, w której obie aplikacje dzielą jedną bazę.
-- Dla nobooking-prod są nieaktualne (nie ma tam danych casa-sol z site_id
-- NULL), ale zostawione, gdyby migracja szła jednak na wspólny projekt.
--
-- Co to znaczy dla tej migracji:
--   • Tabela `bookings` jest wspólna dla obu aplikacji. Casa-sol zapisuje
--     swoje rezerwacje z site_id = '300fabbf-25c4-407e-a783-6461f2ac0bbf'
--     (stała CASASOL_SITE_ID w kodzie casa-sol), więc constraint z sekcji 1b
--     OBEJMIE także jego dane — to dobrze, bo casa-sol zyska ochronę przed
--     podwójną rezerwacją, ale znaczy też, że zapytania kontrolne z sekcji 1a
--     muszą wyjść czysto również dla jego wierszy. Nie filtruj ich po site_id.
--   • Starsze wiersze casa-sol mogą mieć site_id NULL (fix_casasol_compatibility
--     .sql rozluźnił tę kolumnę, a odzyskiwanie z STEP 4 nie ustawiało site_id).
--     Takie wiersze constraint pomija — przy NULL porównanie `=` nie zwraca
--     prawdy. Nie zostaną zepsute, ale nie zyskają ochrony.
--   • `stripe_webhook_events` to nowa tabela, a `orders` nie jest używana
--     przez casa-sol — te dwie zmiany są bezpieczne.
--
-- Sprawdź w Supabase, czy to na pewno właściwy projekt, zanim uruchomisz.
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


-- 1a-bis. DRUGA KONTROLA — odwrócone lub puste daty.
--     daterange(check_in, check_out) rzuca błędem, gdy check_out < check_in,
--     więc taki wiersz wywróci ALTER TABLE niżej. Wiersze casa-sol mają
--     część kolumn nullowalnych, więc warto sprawdzić i NULL-e.
--     Pusty wynik = można kontynuować.
SELECT id, site_id, check_in, check_out, status
FROM bookings
WHERE check_in IS NULL
   OR check_out IS NULL
   OR check_out < check_in;


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
