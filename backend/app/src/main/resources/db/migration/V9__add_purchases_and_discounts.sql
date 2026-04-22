ALTER TABLE guides ADD COLUMN sale_price_cents INTEGER;
ALTER TABLE guides ADD COLUMN sale_ends_at TIMESTAMPTZ;

ALTER TABLE user_profiles ADD COLUMN purchase_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE RESTRICT,
    guide_version_number INTEGER NOT NULL,
    price_cents_paid INTEGER NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    platform_fee_cents INTEGER NOT NULL DEFAULT 0,
    stripe_checkout_session_id VARCHAR(255) NOT NULL UNIQUE,
    stripe_payment_intent_id VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
CREATE INDEX idx_purchases_buyer_id ON purchases(buyer_id);
CREATE INDEX idx_purchases_guide_id ON purchases(guide_id);
CREATE INDEX idx_purchases_status ON purchases(status);
CREATE UNIQUE INDEX idx_purchases_buyer_guide_completed
    ON purchases(buyer_id, guide_id) WHERE status = 'COMPLETED';
