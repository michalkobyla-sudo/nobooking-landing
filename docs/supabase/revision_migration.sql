-- Migration: add revision columns to orders
-- Run in: Supabase Dashboard → SQL Editor → New query → Run

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS revision_token      uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS revision_count      int  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revision_notes      text;

CREATE UNIQUE INDEX IF NOT EXISTS orders_revision_token ON orders (revision_token);
