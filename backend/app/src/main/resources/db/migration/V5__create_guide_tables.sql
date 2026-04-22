-- Guide categories lookup
CREATE TABLE guide_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Main guides table
CREATE TABLE guides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    cover_image_url VARCHAR(500),
    region VARCHAR(100),
    primary_city VARCHAR(100),
    country VARCHAR(100),
    price_cents INTEGER NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    version_number INTEGER NOT NULL DEFAULT 0,
    day_count INTEGER NOT NULL DEFAULT 0,
    place_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_guides_creator_id ON guides(creator_id);
CREATE INDEX idx_guides_status ON guides(status);
CREATE INDEX idx_guides_region ON guides(region);

-- Guide tags (many-to-many)
CREATE TABLE guide_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
    tag VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_guide_tags_guide_id ON guide_tags(guide_id);
CREATE UNIQUE INDEX idx_guide_tags_unique ON guide_tags(guide_id, tag);

-- Guide-to-category join
CREATE TABLE guide_category_mappings (
    guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES guide_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (guide_id, category_id)
);

-- Guide days
CREATE TABLE guide_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    title VARCHAR(200),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_guide_days_guide_id ON guide_days(guide_id);
CREATE UNIQUE INDEX idx_guide_days_unique ON guide_days(guide_id, day_number);

-- Guide blocks (within a day)
CREATE TABLE guide_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_id UUID NOT NULL REFERENCES guide_days(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    title VARCHAR(200),
    description TEXT,
    block_type VARCHAR(50) NOT NULL DEFAULT 'ACTIVITY',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_guide_blocks_day_id ON guide_blocks(day_id);

-- Guide places (within a block)
CREATE TABLE guide_places (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id UUID NOT NULL REFERENCES guide_blocks(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    address VARCHAR(500),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    google_place_id VARCHAR(255),
    category VARCHAR(100),
    price_level INTEGER,
    is_sponsored BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_guide_places_block_id ON guide_places(block_id);

-- Guide place images
CREATE TABLE guide_place_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id UUID NOT NULL REFERENCES guide_places(id) ON DELETE CASCADE,
    image_url VARCHAR(500) NOT NULL,
    caption VARCHAR(200),
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_guide_place_images_place_id ON guide_place_images(place_id);

-- Guide versions (immutable snapshots)
CREATE TABLE guide_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    snapshot JSONB NOT NULL,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_guide_versions_guide_id ON guide_versions(guide_id);
CREATE UNIQUE INDEX idx_guide_versions_unique ON guide_versions(guide_id, version_number);
