-- Add updated_at to follows so the entity can extend BaseEntity (consistent with the
-- 24 other entities). Backfilled from created_at; the @UpdateTimestamp will keep it
-- current on subsequent writes.
ALTER TABLE follows
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE follows SET updated_at = created_at WHERE updated_at IS NULL OR updated_at < created_at;
