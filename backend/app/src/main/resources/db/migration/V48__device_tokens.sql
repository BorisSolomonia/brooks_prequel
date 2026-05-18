-- FCM device tokens registered by Brooks users.
--
-- One row per (user, token) pair. The same user may have multiple devices.
-- The token itself is globally unique — FCM generates UUID-ish tokens that
-- never collide across apps. Upsert on token: the same physical device
-- keeps producing the same token (with occasional rotation, in which case
-- a new row is inserted and the old becomes stale; FCM rejects stale ones,
-- and the NotificationService purges them on first send failure).

CREATE TABLE device_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL,
    token       VARCHAR(512) NOT NULL,
    platform    VARCHAR(16) NOT NULL,
    last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT uk_device_tokens_token UNIQUE (token),
    CONSTRAINT chk_device_tokens_platform CHECK (platform IN ('ANDROID','IOS','WEB'))
);

-- Lookup by user_id is the hot path: every notification send does
-- `SELECT * FROM device_tokens WHERE user_id = ?`.
CREATE INDEX idx_device_tokens_user_id ON device_tokens (user_id);
