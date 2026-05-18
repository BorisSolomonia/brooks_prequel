-- Direct memory shares: A creator can share a memory directly to one of
-- their followers in-app (no token link round-trip). Backed by the same
-- memory_grants table as link-redemption grants, with a new `source`
-- column to distinguish the two paths.

-- Add source enum: LINK_REDEMPTION (existing rows) or DIRECT (new rows)
ALTER TABLE memory_grants
    ADD COLUMN source VARCHAR(32) NOT NULL DEFAULT 'LINK_REDEMPTION';

ALTER TABLE memory_grants
    ADD CONSTRAINT chk_memory_grants_source CHECK (source IN ('LINK_REDEMPTION', 'DIRECT'));

-- Direct shares don't have a share token, so share_id must become nullable.
-- Existing rows (all LINK_REDEMPTION) already have share_id set; we only
-- relax the constraint for future DIRECT inserts.
ALTER TABLE memory_grants
    ALTER COLUMN share_id DROP NOT NULL;

-- Belt-and-suspenders: a DIRECT row should NOT have a share_id, and a
-- LINK_REDEMPTION row MUST have one. Enforced via partial check.
ALTER TABLE memory_grants
    ADD CONSTRAINT chk_memory_grants_source_share_id CHECK (
        (source = 'LINK_REDEMPTION' AND share_id IS NOT NULL)
        OR
        (source = 'DIRECT' AND share_id IS NULL)
    );

-- Note: V43 already added UNIQUE (memory_id, beneficiary_user_id), which
-- enforces the "one grant per (memory, recipient)" rule across both
-- sources. No additional index needed — if a user already has a
-- LINK_REDEMPTION grant for a memory, a subsequent DIRECT share to the
-- same user becomes a no-op (the service short-circuits and returns the
-- existing grant).
