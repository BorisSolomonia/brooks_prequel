-- V58: discounts become a true PERCENTAGE (source of truth) instead of an absolute sale price.
--
-- discount_percent (0-95) is now what the creator sets. sale_price_cents is kept but DERIVED from
-- it on every save (price_cents * (1 - discount_percent/100)), so a discount automatically tracks
-- base-price edits and is currency-agnostic. Display/response code keeps reading sale_price_cents /
-- effectivePrice unchanged.
ALTER TABLE guides ADD COLUMN IF NOT EXISTS discount_percent INT;

-- Backfill the percentage from any existing absolute sale price.
UPDATE guides
   SET discount_percent = ROUND((1 - sale_price_cents::numeric / NULLIF(price_cents, 0)) * 100)
 WHERE sale_price_cents IS NOT NULL
   AND price_cents > 0
   AND sale_price_cents < price_cents;
