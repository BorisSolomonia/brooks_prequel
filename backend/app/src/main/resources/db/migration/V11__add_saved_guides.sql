CREATE TABLE saved_guides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_saved_guides_user_guide_unique
    ON saved_guides(user_id, guide_id);

CREATE INDEX idx_saved_guides_user_id
    ON saved_guides(user_id);

CREATE INDEX idx_saved_guides_guide_id
    ON saved_guides(guide_id);
