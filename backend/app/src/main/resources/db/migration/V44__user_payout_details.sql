ALTER TABLE users
    ADD COLUMN payout_iban VARCHAR(34),
    ADD COLUMN payout_beneficiary_name VARCHAR(255),
    ADD COLUMN payout_currency VARCHAR(3);

ALTER TABLE creator_earnings
    ADD COLUMN paid_at TIMESTAMPTZ,
    ADD COLUMN payment_reference VARCHAR(120);

CREATE INDEX idx_creator_earnings_pending_by_creator
    ON creator_earnings (creator_id)
    WHERE payout_status = 'PENDING';
