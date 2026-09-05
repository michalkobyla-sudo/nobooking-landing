-- ============================================================
-- nobooking.eu — Migracja P1 (audyt 2026-09-05)
-- Uruchom PO 2026-09-05-p0-fixes.sql
--
-- Zawiera:
--   1. sites.token_version — unieważnianie sesji po zmianie hasła (P1 #11)
--
-- Ta migracja NIE jest wymagana do wdrożenia kodu. Aplikacja działa bez
-- niej: brak kolumny jest traktowany jak wersja 0, a zmiana hasła przechodzi
-- wtedy ścieżką awaryjną (bez unieważniania pozostałych sesji, z ostrzeżeniem
-- w logu). Po uruchomieniu migracji mechanizm włącza się sam.
-- ============================================================

ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS token_version int NOT NULL DEFAULT 0;

COMMENT ON COLUMN sites.token_version IS
  'Wersja sesji właściciela. Zmiana hasła podbija tę wartość, co unieważnia '
  'wszystkie wcześniej wydane cookie nb_owner_*. Tokeny sprzed wprowadzenia '
  'mechanizmu nie mają pola v i są traktowane jak wersja 0.';


-- ─── WERYFIKACJA ─────────────────────────────────────────────────────────────

SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'sites' AND column_name = 'token_version';

SELECT slug, token_version FROM sites ORDER BY created_at;
