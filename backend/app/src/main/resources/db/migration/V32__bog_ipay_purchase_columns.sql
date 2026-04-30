DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'purchases'
          AND column_name = 'unipay_order_id'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'purchases'
          AND column_name = 'bog_order_id'
    ) THEN
        ALTER TABLE purchases RENAME COLUMN unipay_order_id TO bog_order_id;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'purchases'
          AND column_name = 'stripe_checkout_session_id'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'purchases'
          AND column_name = 'bog_order_id'
    ) THEN
        ALTER TABLE purchases RENAME COLUMN stripe_checkout_session_id TO bog_order_id;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'purchases'
          AND column_name = 'unipay_transaction_id'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'purchases'
          AND column_name = 'bog_transaction_id'
    ) THEN
        ALTER TABLE purchases RENAME COLUMN unipay_transaction_id TO bog_transaction_id;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'purchases'
          AND column_name = 'stripe_payment_intent_id'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'purchases'
          AND column_name = 'bog_transaction_id'
    ) THEN
        ALTER TABLE purchases RENAME COLUMN stripe_payment_intent_id TO bog_transaction_id;
    END IF;
END $$;

ALTER TABLE purchases ADD COLUMN IF NOT EXISTS bog_order_id VARCHAR(255);
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS bog_payment_hash VARCHAR(255);
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS bog_ipay_payment_id VARCHAR(255);
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS bog_transaction_id VARCHAR(255);

UPDATE purchases
SET bog_order_id = COALESCE(bog_order_id, id::text)
WHERE bog_order_id IS NULL;

UPDATE purchases
SET bog_payment_hash = COALESCE(bog_payment_hash, bog_order_id, id::text)
WHERE bog_payment_hash IS NULL;

ALTER TABLE purchases ALTER COLUMN bog_order_id SET NOT NULL;
ALTER TABLE purchases ALTER COLUMN bog_payment_hash SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_purchases_bog_order_id ON purchases(bog_order_id);
