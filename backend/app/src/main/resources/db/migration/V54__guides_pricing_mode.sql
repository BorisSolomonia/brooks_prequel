-- V54 — pricing_mode on guides (PAID | FREE_PUBLIC | FREE_FOR_FOLLOWERS)
--
-- Enables two new monetisation modes on top of the existing paid flow:
--   • FREE_PUBLIC          — guide is free for anyone signed in.
--   • FREE_FOR_FOLLOWERS   — guide is free for users who already
--                            follow the creator. Non-followers see
--                            the regular paid CTA.
--
-- Backwards-compatible: every existing guide gets DEFAULT 'PAID', which
-- preserves the current checkout behaviour. Creators opt INTO a free
-- mode explicitly via the editor; no surprise free guides.
--
-- The pricing_mode is enforced at checkout time in
-- GuidePurchaseService.createCheckoutSession (see GuidePricingMode
-- enum + the FREE-path branch added in the same change).
--
-- Idempotent: ADD COLUMN IF NOT EXISTS + ADD CONSTRAINT IF NOT EXISTS.
-- Postgres 9.6+ supports IF NOT EXISTS on ADD COLUMN; the constraint
-- variant uses DO $$ ... $$ to guard against duplicate constraint name.

ALTER TABLE guides
    ADD COLUMN IF NOT EXISTS pricing_mode VARCHAR(32) NOT NULL DEFAULT 'PAID';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conname = 'guides_pricing_mode_valid'
    ) THEN
        ALTER TABLE guides
            ADD CONSTRAINT guides_pricing_mode_valid
            CHECK (pricing_mode IN ('PAID', 'FREE_PUBLIC', 'FREE_FOR_FOLLOWERS'));
    END IF;
END $$;

-- Index lets us cheaply query "all FREE_FOR_FOLLOWERS guides this creator
-- has published" from a follower's perspective without scanning every row.
CREATE INDEX IF NOT EXISTS idx_guides_pricing_mode
    ON guides (pricing_mode)
    WHERE pricing_mode <> 'PAID';
