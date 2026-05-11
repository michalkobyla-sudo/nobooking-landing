-- ============================================================
-- FIX + RECOVERY: casasol-almadelmar.com
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================
-- Problem: booking_schema.sql dropped and recreated blocked_dates + bookings
-- with new nobooking schema, breaking casasol-almadelmar.com app.
-- ============================================================

-- STEP 1: FIX blocked_dates — add back casa-sol columns
ALTER TABLE blocked_dates
  ALTER COLUMN site_id DROP NOT NULL;

ALTER TABLE blocked_dates
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date   date;

-- STEP 2: FIX bookings — make nobooking required columns nullable
ALTER TABLE bookings
  ALTER COLUMN site_id     DROP NOT NULL,
  ALTER COLUMN guest_name  DROP NOT NULL,
  ALTER COLUMN guest_email DROP NOT NULL,
  ALTER COLUMN guest_phone DROP NOT NULL;

-- STEP 3: FIX bookings — add back casa-sol specific columns
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS guest_id        uuid REFERENCES guests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS adults          int,
  ADD COLUMN IF NOT EXISTS children        int,
  ADD COLUMN IF NOT EXISTS price_per_night numeric,
  ADD COLUMN IF NOT EXISTS cleaning_fee    numeric,
  ADD COLUMN IF NOT EXISTS deposit_amount  numeric;

-- ============================================================
-- STEP 4: RECOVERY — restore blocked dates from Resend email logs
-- Daty odczytane z historii emaili Resend (booking confirmations)
-- ============================================================

-- POTWIERDZONE REZERWACJE (email "Potwierdzenie" wysłany):
INSERT INTO blocked_dates (start_date, end_date, reason) VALUES
  ('2026-04-18', '2026-04-24', 'Joanna Borkowska — +48531893989 — 342 PLN'),
  ('2026-05-19', '2026-05-31', 'Lidia Kobylińska — +48608557870 — 684 PLN'),
  ('2026-06-19', '2026-06-29', 'Anna BEYM — annabeym@interia.pl — 690 PLN (Stripe live)'),
  ('2026-07-21', '2026-07-31', 'Agnieszka Linkowska — linkowska.a@hotmail.com'),
  ('2026-08-02', '2026-08-09', 'Amanda Roszak — amandaroszak2@wp.pl'),
  ('2026-08-10', '2026-08-20', 'Marcin Kraus — kacza120@gmail.com'),
  ('2026-08-27', '2026-09-06', 'Karolina Zalewska — zalewska.karolina@interia.pl');

-- OCZEKUJĄCE (email "Rezerwacja przyjęta" — bez płatności, do potwierdzenia):
-- Odkomentuj jeśli chcesz je zablokować w kalendarzu:
/*
INSERT INTO blocked_dates (start_date, end_date, reason) VALUES
  ('2026-11-05', '2026-11-09', 'PENDING: Waldemar Bożętka — wald84@wp.pl — brak płatności'),
  ('2026-08-05', '2026-08-26', 'PENDING: Andrzej Głowacki — andrzejglowacki88@gmail.com — brak płatności');
*/
