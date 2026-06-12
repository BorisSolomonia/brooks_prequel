-- BOR-59: missing ordering/composite indexes for hot read paths surfaced by the
-- performance audit. Additive only — no schema or data changes. Idempotent.

-- 1. Guide review list: GuideReviewRepository.findByGuideIdOrderByCreatedAtDesc.
--    V16 only indexed (guide_id); every paginated review load sorted in memory.
CREATE INDEX IF NOT EXISTS idx_guide_reviews_guide_created
    ON guide_reviews (guide_id, created_at DESC);

-- 2. Creator review list: CreatorReviewRepository.findByCreatorIdOrderByCreatedAtDesc.
--    V25 only indexed (creator_id).
CREATE INDEX IF NOT EXISTS idx_creator_reviews_creator_created
    ON creator_reviews (creator_id, created_at DESC);

-- 3. Place review list: PlaceReviewRepository.findByPlaceIdOrderByCreatedAtDesc.
CREATE INDEX IF NOT EXISTS idx_place_reviews_place_created
    ON place_reviews (place_id, created_at DESC);

-- 4. Saved-guides library: SavedGuideRepository.findByUserIdOrderByCreatedAtDesc.
--    V27 added (guide_id, created_at) for save-counts but not the user-side list.
CREATE INDEX IF NOT EXISTS idx_saved_guides_user_created
    ON saved_guides (user_id, created_at DESC);

-- 5. Reconciliation sweep (runs on a schedule):
--    PurchaseRepository.findTop200ByStatusAndCreatedAtBetweenOrderByCreatedAtAsc.
--    Existing idx_purchases_status alone degrades as completed rows accumulate.
CREATE INDEX IF NOT EXISTS idx_purchases_status_created
    ON purchases (status, created_at);

-- 6. My-trips view: GuidePurchaseRepository.findByBuyerIdAndStatusOrderByCreatedAtDesc
--    (plus the findFirstByBuyerIdAndGuideId... variants share the buyer_id prefix).
CREATE INDEX IF NOT EXISTS idx_guide_purchases_buyer_status_created
    ON guide_purchases (buyer_id, status, created_at DESC);

-- 7. Discovery "newest" sort: SearchRepository orders published guides by created_at;
--    only creator_id/status/region were indexed (V5), so NEWEST browse scanned the table.
CREATE INDEX IF NOT EXISTS idx_guides_status_created
    ON guides (status, created_at DESC);
