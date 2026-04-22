CREATE TABLE guide_stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_url VARCHAR(500) NOT NULL,
    caption VARCHAR(200),
    link_guide_id UUID,
    expires_at TIMESTAMPTZ NOT NULL,
    view_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_guide_stories_creator_id ON guide_stories(creator_id);
CREATE INDEX idx_guide_stories_expires_at ON guide_stories(expires_at);
CREATE INDEX idx_guide_stories_creator_expires ON guide_stories(creator_id, expires_at);
