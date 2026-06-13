-- BOR-61: composite index for the map-discovery influencer-pins query
-- (UserProfileRepository.findInfluencerPins). Its per-creator LATERAL subquery runs
--   WHERE creator_id = ? AND status = 'PUBLISHED' ORDER BY updated_at DESC, created_at DESC LIMIT 1
-- for up to maxPins (~500) creators on every cache miss. The existing guides indexes are
-- single-column (creator_id), (status) and (status, created_at) — none lets that LATERAL
-- seek + LIMIT 1 without an extra sort. This composite serves it as an index-only range
-- scan. Additive only.
CREATE INDEX IF NOT EXISTS idx_guides_creator_status_updated
    ON guides (creator_id, status, updated_at DESC, created_at DESC);
