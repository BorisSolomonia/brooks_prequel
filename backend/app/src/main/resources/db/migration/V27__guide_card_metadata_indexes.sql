CREATE INDEX idx_guide_purchases_guide_status_created_at
    ON guide_purchases (guide_id, status, created_at);

CREATE INDEX idx_saved_guides_guide_created_at
    ON saved_guides (guide_id, created_at);
