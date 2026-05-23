-- ============================================================
-- nobooking.eu — Renewal System Migration
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Both in: old project (if still used) AND new nobooking-prod
-- ============================================================

-- ─── 1. Add renewal columns to sites ─────────────────────────────────────────

ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS expires_at        timestamptz,
  ADD COLUMN IF NOT EXISTS renewal_price_pln int,   -- in grosze (e.g. 79900 = 799 zł)
  ADD COLUMN IF NOT EXISTS renewal_price_eur int,   -- in eurocenty (e.g. 19900 = 199 €)
  ADD COLUMN IF NOT EXISTS renewal_currency  text check (renewal_currency in ('pln', 'eur'));

-- Backfill existing sites: 2 years from creation
UPDATE sites
SET expires_at = created_at + INTERVAL '2 years'
WHERE expires_at IS NULL;

-- Index for cron query performance
CREATE INDEX IF NOT EXISTS sites_expires_at_idx ON sites (expires_at) WHERE active = true;

-- ─── 2. Renewal reminders tracking ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS renewal_reminders (
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid not null references sites(id) on delete cascade,
  days_before int not null,  -- 90, 30, 14, 7, 1, -14 (grace period end)
  sent_at     timestamptz not null default now(),
  unique (site_id, days_before)
);

CREATE INDEX IF NOT EXISTS renewal_reminders_site_idx ON renewal_reminders (site_id);

ALTER TABLE renewal_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no_anon_renewal_reminders" ON renewal_reminders FOR ALL TO anon USING (false);

-- ─── VERIFY ──────────────────────────────────────────────────────────────────

SELECT slug, expires_at, renewal_price_pln, renewal_price_eur, renewal_currency
FROM sites
ORDER BY created_at;
