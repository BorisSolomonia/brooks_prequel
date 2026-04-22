-- Add commission_rate_bps to purchases so earnings record can be written without re-resolving
ALTER TABLE purchases ADD COLUMN commission_rate_bps INTEGER NOT NULL DEFAULT 2000;

-- Commission rules: GLOBAL / REGION / CREATOR
CREATE TABLE commission_rules (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_type   VARCHAR(20) NOT NULL,
    region      VARCHAR(100),
    creator_id  UUID,
    rate_bps    INTEGER     NOT NULL,
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    notes       TEXT,
    created_by  UUID        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one active GLOBAL rule at a time
CREATE UNIQUE INDEX idx_commission_rules_one_global
    ON commission_rules (rule_type)
    WHERE rule_type = 'GLOBAL' AND is_active = TRUE;

CREATE INDEX idx_commission_rules_creator
    ON commission_rules (creator_id)
    WHERE rule_type = 'CREATOR' AND is_active = TRUE;

CREATE INDEX idx_commission_rules_region
    ON commission_rules (region)
    WHERE rule_type = 'REGION' AND is_active = TRUE;

-- Time-limited promotional overrides
CREATE TABLE commission_promotions (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(200) NOT NULL,
    description TEXT,
    rate_bps    INTEGER     NOT NULL,
    target_type VARCHAR(20) NOT NULL,
    region      VARCHAR(100),
    starts_at   TIMESTAMPTZ NOT NULL,
    ends_at     TIMESTAMPTZ NOT NULL,
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_by  UUID        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_promotions_active_window
    ON commission_promotions (starts_at, ends_at)
    WHERE is_active = TRUE;

-- Creator list for CREATOR_LIST promotions
CREATE TABLE commission_promotion_creators (
    promotion_id UUID NOT NULL REFERENCES commission_promotions(id) ON DELETE CASCADE,
    creator_id   UUID NOT NULL,
    PRIMARY KEY (promotion_id, creator_id)
);

-- Immutable per-purchase earnings record (written when purchase completes)
CREATE TABLE creator_earnings (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id        UUID        NOT NULL UNIQUE REFERENCES purchases(id) ON DELETE RESTRICT,
    creator_id         UUID        NOT NULL,
    gross_amount_cents INTEGER     NOT NULL,
    rate_bps           INTEGER     NOT NULL,
    commission_cents   INTEGER     NOT NULL,
    net_amount_cents   INTEGER     NOT NULL,
    rule_source        VARCHAR(30) NOT NULL,
    rule_id            UUID,
    payout_status      VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_creator_earnings_creator
    ON creator_earnings (creator_id, payout_status);
