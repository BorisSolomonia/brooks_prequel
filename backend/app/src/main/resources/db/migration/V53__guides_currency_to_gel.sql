-- V53 — flip guides.currency default to GEL and backfill existing rows.
--
-- Brooks's only payment processor is BOG iPay, which accepts GEL
-- exclusively. PurchaseService refuses to create a checkout session
-- for any guide where currency != 'GEL', throwing
--     "This guide is not priced in GEL and cannot be purchased through BOG iPay"
--
-- The Guide entity, GuideCreateRequest, GuideEditor, GuideCard, and the
-- V5 column default all sat at 'USD' — a leftover from a generic template
-- before Brooks committed to the Georgian payment rail. Every freshly-
-- created guide thus shipped as USD and was unbuyable.
--
-- This migration:
--   1. Changes the column DEFAULT to 'GEL' so future direct INSERTs
--      (seed scripts, manual SQL) match the application-level default.
--   2. Backfills existing rows where currency='USD' to 'GEL'. The
--      numeric price_cents stays the same — creators saw GEL prices
--      in the UI when they typed the value, so the number was always
--      intended as GEL. We're correcting the label, not the value.
--
-- If a future deployment of Brooks legitimately serves USD-priced
-- guides, the right path is to add a second payment provider (Stripe,
-- PayPal) rather than reverse this migration.
--
-- Safe to re-run: ALTER COLUMN DEFAULT is idempotent; the UPDATE
-- becomes a no-op once all USD rows have flipped.

ALTER TABLE guides ALTER COLUMN currency SET DEFAULT 'GEL';

UPDATE guides
   SET currency = 'GEL'
 WHERE currency = 'USD';
