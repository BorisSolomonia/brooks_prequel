-- Geo-lock direct in-app memory shares to parity with share-link reveals.
--
-- Before this, a direct share created a fully-usable memory_grant immediately,
-- so the recipient could read the memory (and its push notification) without
-- ever reaching the location. We add a `revealed_at` timestamp: a grant is
-- only "revealed" (content readable) once the beneficiary has confirmed they
-- are within the unlock radius. NULL = locked / pending reveal.
--
-- Backfill is non-destructive: every EXISTING grant is marked already-revealed
-- (revealed_at = granted_at) so no current user loses access they already had.
-- Only grants created AFTER this migration (new direct shares) start locked.
-- Link-redemption grants are created post-reveal anyway, so revealed = correct.

ALTER TABLE memory_grants ADD COLUMN revealed_at TIMESTAMPTZ;

UPDATE memory_grants SET revealed_at = granted_at WHERE revealed_at IS NULL;

-- Partial index to speed the "which of these granted memories are revealed?"
-- lookup used by the map + shared-list read paths.
CREATE INDEX idx_memory_grants_revealed_for_viewer
    ON memory_grants (beneficiary_user_id, memory_id)
    WHERE removed_at IS NULL AND revealed_at IS NOT NULL;
