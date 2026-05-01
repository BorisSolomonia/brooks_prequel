-- Keep one realistic published guide free so the dev checkout flow can be tested
-- end-to-end without a payment provider.
UPDATE guides
SET price_cents = 0,
    sale_price_cents = NULL,
    sale_ends_at = NULL,
    currency = 'USD',
    updated_at = NOW()
WHERE id = 'b0000006-0000-4000-8000-000000000000';

UPDATE guide_versions
SET snapshot = jsonb_set(
    jsonb_set(snapshot, '{priceCents}', '0'::jsonb, true),
    '{currency}', '"USD"'::jsonb, true
)
WHERE guide_id = 'b0000006-0000-4000-8000-000000000000'
  AND version_number = 1;
