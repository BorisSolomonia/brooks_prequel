CREATE TABLE memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text_content VARCHAR(500) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    place_label VARCHAR(200),
    visibility VARCHAR(30) NOT NULL DEFAULT 'PRIVATE',
    expires_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_memories_creator_id ON memories(creator_id);
CREATE INDEX idx_memories_visibility ON memories(visibility);
CREATE INDEX idx_memories_location ON memories(latitude, longitude);
CREATE INDEX idx_memories_active ON memories(deleted_at, expires_at);

CREATE TABLE memory_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    media_type VARCHAR(20) NOT NULL,
    url VARCHAR(700) NOT NULL,
    object_name VARCHAR(700),
    content_type VARCHAR(120),
    size_bytes BIGINT,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_memory_media_memory_id ON memory_media(memory_id);

CREATE TABLE memory_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    token VARCHAR(80) NOT NULL UNIQUE,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_memory_shares_memory_id ON memory_shares(memory_id);
CREATE INDEX idx_memory_shares_token ON memory_shares(token);

CREATE TABLE memory_reveals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    share_id UUID REFERENCES memory_shares(id) ON DELETE SET NULL,
    viewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    succeeded BOOLEAN NOT NULL,
    distance_bucket VARCHAR(40),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_memory_reveals_memory_id ON memory_reveals(memory_id);
CREATE INDEX idx_memory_reveals_viewer_id ON memory_reveals(viewer_id);

CREATE TABLE memory_creator_visibility_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hide_public_memories BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(viewer_id, creator_id),
    CHECK (viewer_id != creator_id)
);

CREATE INDEX idx_memory_creator_visibility_viewer ON memory_creator_visibility_preferences(viewer_id);

CREATE TABLE product_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name VARCHAR(80) NOT NULL,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    memory_id UUID REFERENCES memories(id) ON DELETE SET NULL,
    share_token VARCHAR(80),
    source VARCHAR(80),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_events_event_name ON product_events(event_name);
CREATE INDEX idx_product_events_actor_id ON product_events(actor_id);
