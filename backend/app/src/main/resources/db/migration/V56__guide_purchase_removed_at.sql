-- Soft-remove for purchased guides. When a buyer removes a guide from "My
-- Trips" we set removed_at instead of deleting the row: the COMPLETED purchase
-- (and the invoice record retained for tax law) is preserved, the trip is just
-- hidden. Re-buying the guide clears removed_at (free restore) because the user
-- already owns that version. NULL = active/visible.
ALTER TABLE guide_purchases ADD COLUMN removed_at TIMESTAMPTZ;

CREATE INDEX idx_guide_purchases_active_for_buyer
    ON guide_purchases (buyer_id, status)
    WHERE removed_at IS NULL;
