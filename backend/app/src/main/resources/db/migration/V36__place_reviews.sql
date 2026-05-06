CREATE TABLE place_reviews (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id      UUID NOT NULL REFERENCES guide_places(id) ON DELETE CASCADE,
    guide_id      UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating        SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text   TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_place_review_user UNIQUE (place_id, user_id)
);
CREATE INDEX idx_place_reviews_place ON place_reviews(place_id);
CREATE INDEX idx_place_reviews_guide ON place_reviews(guide_id);
