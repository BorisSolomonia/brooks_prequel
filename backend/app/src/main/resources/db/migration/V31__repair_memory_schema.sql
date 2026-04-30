CREATE TABLE IF NOT EXISTS memories (
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

ALTER TABLE memories ADD COLUMN IF NOT EXISTS creator_id UUID;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS text_content VARCHAR(500);
ALTER TABLE memories ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS place_label VARCHAR(200);
ALTER TABLE memories ADD COLUMN IF NOT EXISTS visibility VARCHAR(30) DEFAULT 'PRIVATE';
ALTER TABLE memories ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE memories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_memories_creator_id ON memories(creator_id);
CREATE INDEX IF NOT EXISTS idx_memories_visibility ON memories(visibility);
CREATE INDEX IF NOT EXISTS idx_memories_location ON memories(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_memories_active ON memories(deleted_at, expires_at);

CREATE TABLE IF NOT EXISTS memory_media (
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

ALTER TABLE memory_media ADD COLUMN IF NOT EXISTS memory_id UUID;
ALTER TABLE memory_media ADD COLUMN IF NOT EXISTS media_type VARCHAR(20);
ALTER TABLE memory_media ADD COLUMN IF NOT EXISTS url VARCHAR(700);
ALTER TABLE memory_media ADD COLUMN IF NOT EXISTS object_name VARCHAR(700);
ALTER TABLE memory_media ADD COLUMN IF NOT EXISTS content_type VARCHAR(120);
ALTER TABLE memory_media ADD COLUMN IF NOT EXISTS size_bytes BIGINT;
ALTER TABLE memory_media ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;
ALTER TABLE memory_media ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE memory_media ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_memory_media_memory_id ON memory_media(memory_id);

CREATE TABLE IF NOT EXISTS memory_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    token VARCHAR(80) NOT NULL UNIQUE,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE memory_shares ADD COLUMN IF NOT EXISTS memory_id UUID;
ALTER TABLE memory_shares ADD COLUMN IF NOT EXISTS token VARCHAR(80);
ALTER TABLE memory_shares ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
ALTER TABLE memory_shares ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE memory_shares ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_memory_shares_memory_id ON memory_shares(memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_shares_token ON memory_shares(token);
CREATE UNIQUE INDEX IF NOT EXISTS idx_memory_shares_one_active_per_memory ON memory_shares(memory_id) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS memory_reveals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    share_id UUID REFERENCES memory_shares(id) ON DELETE SET NULL,
    viewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    succeeded BOOLEAN NOT NULL,
    distance_bucket VARCHAR(40),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE memory_reveals ADD COLUMN IF NOT EXISTS memory_id UUID;
ALTER TABLE memory_reveals ADD COLUMN IF NOT EXISTS share_id UUID;
ALTER TABLE memory_reveals ADD COLUMN IF NOT EXISTS viewer_id UUID;
ALTER TABLE memory_reveals ADD COLUMN IF NOT EXISTS succeeded BOOLEAN;
ALTER TABLE memory_reveals ADD COLUMN IF NOT EXISTS distance_bucket VARCHAR(40);
ALTER TABLE memory_reveals ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE memory_reveals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_memory_reveals_memory_id ON memory_reveals(memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_reveals_viewer_id ON memory_reveals(viewer_id);

CREATE TABLE IF NOT EXISTS memory_creator_visibility_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hide_public_memories BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(viewer_id, creator_id),
    CHECK (viewer_id != creator_id)
);

ALTER TABLE memory_creator_visibility_preferences ADD COLUMN IF NOT EXISTS viewer_id UUID;
ALTER TABLE memory_creator_visibility_preferences ADD COLUMN IF NOT EXISTS creator_id UUID;
ALTER TABLE memory_creator_visibility_preferences ADD COLUMN IF NOT EXISTS hide_public_memories BOOLEAN DEFAULT TRUE;
ALTER TABLE memory_creator_visibility_preferences ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE memory_creator_visibility_preferences ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_memory_creator_visibility_viewer ON memory_creator_visibility_preferences(viewer_id);

CREATE TABLE IF NOT EXISTS product_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name VARCHAR(80) NOT NULL,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    memory_id UUID REFERENCES memories(id) ON DELETE SET NULL,
    share_token VARCHAR(80),
    source VARCHAR(80),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE product_events ADD COLUMN IF NOT EXISTS event_name VARCHAR(80);
ALTER TABLE product_events ADD COLUMN IF NOT EXISTS actor_id UUID;
ALTER TABLE product_events ADD COLUMN IF NOT EXISTS memory_id UUID;
ALTER TABLE product_events ADD COLUMN IF NOT EXISTS share_token VARCHAR(80);
ALTER TABLE product_events ADD COLUMN IF NOT EXISTS source VARCHAR(80);
ALTER TABLE product_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE product_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_product_events_event_name ON product_events(event_name);
CREATE INDEX IF NOT EXISTS idx_product_events_actor_id ON product_events(actor_id);
