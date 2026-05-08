-- Denormalise three purchase-display fields onto `purchases` so the buyer's purchase list
-- doesn't have to fetch + parse the full `guide_versions.snapshot` JSON for every row just
-- to render a card (title / cover / region).
--
-- The snapshot is still authoritative for the full-detail buyer view; this duplication is
-- limited to the fields that show up in lists.

ALTER TABLE purchases ADD COLUMN guide_title_at_purchase TEXT;
ALTER TABLE purchases ADD COLUMN cover_image_url_at_purchase TEXT;
ALTER TABLE purchases ADD COLUMN region_at_purchase TEXT;

-- Backfill from `guides` rather than `guide_versions` because the live `guides` row holds
-- the same metadata for purchases-already-completed in this environment, and parsing the
-- JSON snapshot in plain SQL is awkward. New purchases will write these fields directly
-- in PurchaseService.
UPDATE purchases p
SET
    guide_title_at_purchase = g.title,
    cover_image_url_at_purchase = g.cover_image_url,
    region_at_purchase = g.region
FROM guides g
WHERE g.id = p.guide_id
  AND p.guide_title_at_purchase IS NULL;
