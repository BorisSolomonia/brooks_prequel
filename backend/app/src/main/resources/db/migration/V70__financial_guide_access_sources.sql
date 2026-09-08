CREATE TABLE guide_access_sources (
    financial_purchase_id UUID PRIMARY KEY REFERENCES purchases(id),
    guide_purchase_id UUID NOT NULL REFERENCES guide_purchases(id),
    revoked_at TIMESTAMPTZ
);
CREATE INDEX idx_guide_access_sources_active
    ON guide_access_sources(guide_purchase_id) WHERE revoked_at IS NULL;

-- Existing financial materialization recorded bog_ipay but did not retain the purchase id.
-- Preserve all matching sources rather than guessing a single payment for a shared entitlement.
INSERT INTO guide_access_sources(financial_purchase_id, guide_purchase_id, revoked_at)
SELECT p.id, gp.id, CASE WHEN p.status = 'REFUNDED' THEN NOW() ELSE NULL END
FROM purchases p
JOIN guide_purchases gp ON gp.buyer_id = p.buyer_id
    AND gp.guide_id = p.guide_id AND gp.guide_version_number = p.guide_version_number
WHERE gp.provider = 'bog_ipay' AND p.status IN ('COMPLETED', 'REFUNDED');

UPDATE guide_purchases gp SET status = 'CANCELED', updated_at = NOW()
WHERE gp.provider = 'bog_ipay'
  AND EXISTS (SELECT 1 FROM guide_access_sources s WHERE s.guide_purchase_id = gp.id)
  AND NOT EXISTS (SELECT 1 FROM guide_access_sources s
                  WHERE s.guide_purchase_id = gp.id AND s.revoked_at IS NULL);
