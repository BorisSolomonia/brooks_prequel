ALTER TABLE guide_reviews
    DROP CONSTRAINT IF EXISTS uq_guide_review;

ALTER TABLE guide_reviews
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS helpful_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS not_helpful_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE guide_reviews
    ADD CONSTRAINT uq_guide_review_user_guide UNIQUE (guide_id, buyer_id);

CREATE TABLE creator_reviews (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewer_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating            SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text       TEXT,
    helpful_count     INTEGER NOT NULL DEFAULT 0,
    not_helpful_count INTEGER NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_creator_review_user_creator UNIQUE (creator_id, reviewer_id)
);

CREATE INDEX idx_creator_reviews_creator_id ON creator_reviews(creator_id);

CREATE TABLE guide_review_votes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guide_review_id UUID NOT NULL REFERENCES guide_reviews(id) ON DELETE CASCADE,
    voter_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vote_value      VARCHAR(20) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_guide_review_vote UNIQUE (guide_review_id, voter_id)
);

CREATE INDEX idx_guide_review_votes_review_id ON guide_review_votes(guide_review_id);

CREATE TABLE creator_review_votes (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_review_id UUID NOT NULL REFERENCES creator_reviews(id) ON DELETE CASCADE,
    voter_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vote_value        VARCHAR(20) NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_creator_review_vote UNIQUE (creator_review_id, voter_id)
);

CREATE INDEX idx_creator_review_votes_review_id ON creator_review_votes(creator_review_id);

ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS creator_rating_average DOUBLE PRECISION NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS creator_review_count INTEGER NOT NULL DEFAULT 0;
