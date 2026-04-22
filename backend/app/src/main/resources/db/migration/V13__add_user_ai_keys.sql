CREATE TABLE user_ai_keys (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider       VARCHAR(20) NOT NULL,
    encrypted_key  TEXT        NOT NULL,
    key_hint       VARCHAR(10) NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_ai_keys UNIQUE (user_id, provider)
);

CREATE INDEX idx_user_ai_keys_user_id ON user_ai_keys(user_id);
