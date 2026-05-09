-- Schema-safety + missing-index pass surfaced by the architectural review.
-- Idempotent — safe to re-run on databases that have already been touched out-of-band.

-- 1. commission_rules: enforce that rule_type matches the populated discriminator columns.
--    Prevents a CREATOR rule with NULL creator_id silently becoming a global catch-all.
ALTER TABLE commission_rules
    DROP CONSTRAINT IF EXISTS commission_rules_type_columns_check;

ALTER TABLE commission_rules
    ADD CONSTRAINT commission_rules_type_columns_check CHECK (
        (rule_type = 'GLOBAL'  AND region IS NULL     AND creator_id IS NULL)
     OR (rule_type = 'CREATOR' AND creator_id IS NOT NULL)
     OR (rule_type = 'REGION'  AND region IS NOT NULL AND creator_id IS NULL)
    );

-- 2. follows: composite index for "recent followers of user X" queries.
CREATE INDEX IF NOT EXISTS idx_follows_following_created
    ON follows (following_id, created_at DESC);

-- 3. guide_places: composite index for ordered-render of a block's places.
CREATE INDEX IF NOT EXISTS idx_guide_places_block_position
    ON guide_places (block_id, position);

-- 4. creator_earnings: standalone index on payout_status for platform-wide reporting
--    (e.g., "all PENDING payouts"). The existing (creator_id, payout_status) composite
--    only helps when filtering by creator first.
CREATE INDEX IF NOT EXISTS idx_creator_earnings_payout_status
    ON creator_earnings (payout_status);

-- 5. Drop legacy Stripe payment columns. V32 idempotently renamed them to BOG-shaped
--    counterparts but left the originals in databases that ran V10 first. Safe with
--    IF EXISTS because both names cannot coexist after V32.
ALTER TABLE purchases
    DROP COLUMN IF EXISTS stripe_checkout_session_id,
    DROP COLUMN IF EXISTS stripe_payment_intent_id;
