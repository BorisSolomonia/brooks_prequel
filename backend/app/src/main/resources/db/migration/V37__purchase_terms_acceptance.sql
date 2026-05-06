ALTER TABLE purchases
    ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
