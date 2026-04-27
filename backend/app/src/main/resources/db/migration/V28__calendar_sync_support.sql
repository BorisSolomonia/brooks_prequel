ALTER TABLE guide_purchases
    ALTER COLUMN guide_version_id DROP NOT NULL,
    ADD COLUMN trip_start_time TIME,
    ADD COLUMN trip_source VARCHAR(30) NOT NULL DEFAULT 'PURCHASE',
    ADD COLUMN guide_snapshot JSONB;

CREATE TABLE user_calendar_connections (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID NOT NULL,
    provider VARCHAR(30) NOT NULL,
    provider_account_email VARCHAR(255),
    encrypted_refresh_token TEXT NOT NULL,
    access_token TEXT,
    access_token_expires_at TIMESTAMPTZ,
    external_calendar_id VARCHAR(255),
    connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_user_calendar_connections_user_provider
    ON user_calendar_connections (user_id, provider);

CREATE TABLE trip_calendar_events (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    purchase_id UUID NOT NULL REFERENCES guide_purchases(id) ON DELETE CASCADE,
    trip_item_id UUID NOT NULL REFERENCES guide_trip_items(id) ON DELETE CASCADE,
    provider VARCHAR(30) NOT NULL,
    external_calendar_id VARCHAR(255) NOT NULL,
    external_event_id VARCHAR(255) NOT NULL,
    last_synced_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_trip_calendar_events_item_provider
    ON trip_calendar_events (trip_item_id, provider);

CREATE INDEX idx_trip_calendar_events_purchase_provider
    ON trip_calendar_events (purchase_id, provider);
