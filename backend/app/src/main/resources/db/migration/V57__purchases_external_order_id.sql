-- V57: persist the merchant-side external_order_id (a.k.a. shop_order_id) on purchases.
--
-- BOG returns its OWN generated id (stored in bog_order_id, used by the webhook). The
-- post-payment redirect URL, however, only carries the id we chose at checkout time
-- (external_order_id), because BOG's id doesn't exist yet when we build the redirect URLs.
-- Without storing external_order_id we cannot locate a purchase from the return page, so the
-- success page always reported "purchase not found" even for completed purchases.
--
-- Nullable: free-checkout rows and legacy rows have no external id. Partial unique index so
-- set values are unique while multiple NULLs are allowed.
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS external_order_id VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS ux_purchases_external_order_id
    ON purchases (external_order_id)
    WHERE external_order_id IS NOT NULL;
