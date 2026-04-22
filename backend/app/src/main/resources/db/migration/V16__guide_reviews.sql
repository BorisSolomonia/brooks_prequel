CREATE TABLE guide_reviews (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guide_id     UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
    buyer_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purchase_id  UUID NOT NULL REFERENCES guide_purchases(id) ON DELETE CASCADE,
    rating       SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text  TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_guide_review UNIQUE (purchase_id)
);
CREATE INDEX idx_guide_reviews_guide_id ON guide_reviews(guide_id);
