ALTER TABLE guides
    ADD COLUMN timezone VARCHAR(80);

ALTER TABLE guide_blocks
    ADD COLUMN suggested_start_minute INTEGER;

ALTER TABLE guide_places
    ADD COLUMN suggested_start_minute INTEGER,
    ADD COLUMN suggested_duration_minutes INTEGER;

CREATE TABLE guide_purchases (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    buyer_id UUID NOT NULL,
    guide_id UUID NOT NULL,
    guide_version_id UUID NOT NULL,
    guide_version_number INTEGER NOT NULL,
    provider VARCHAR(30) NOT NULL,
    provider_session_id VARCHAR(255),
    amount_cents INTEGER NOT NULL,
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(20) NOT NULL,
    trip_start_date DATE,
    trip_end_date DATE,
    trip_timezone VARCHAR(80)
);

CREATE UNIQUE INDEX idx_guide_purchases_buyer_version_unique
    ON guide_purchases (buyer_id, guide_version_id);

CREATE UNIQUE INDEX idx_guide_purchases_provider_session_unique
    ON guide_purchases (provider_session_id)
    WHERE provider_session_id IS NOT NULL;

CREATE INDEX idx_guide_purchases_buyer_id
    ON guide_purchases (buyer_id);

CREATE INDEX idx_guide_purchases_guide_id
    ON guide_purchases (guide_id);

CREATE TABLE guide_trip_items (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    purchase_id UUID NOT NULL REFERENCES guide_purchases(id) ON DELETE CASCADE,
    place_id UUID NOT NULL,
    day_number INTEGER NOT NULL,
    block_position INTEGER NOT NULL,
    place_position INTEGER NOT NULL,
    block_title VARCHAR(200),
    place_name VARCHAR(200) NOT NULL,
    place_address VARCHAR(500),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    suggested_start_minute INTEGER,
    suggested_duration_minutes INTEGER,
    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    skipped BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX idx_guide_trip_items_purchase_place_unique
    ON guide_trip_items (purchase_id, place_id);

CREATE INDEX idx_guide_trip_items_purchase_id
    ON guide_trip_items (purchase_id);
