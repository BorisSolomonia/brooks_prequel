CREATE TABLE memory_grants (
    id UUID PRIMARY KEY,
    memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE RESTRICT,
    beneficiary_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    share_id UUID NOT NULL REFERENCES memory_shares(id) ON DELETE RESTRICT,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    removed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT memory_grants_unique_per_user UNIQUE (memory_id, beneficiary_user_id)
);
CREATE INDEX idx_memory_grants_active_for_viewer
    ON memory_grants (beneficiary_user_id, memory_id) WHERE removed_at IS NULL;
