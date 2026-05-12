CREATE TABLE audit_events (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(64) NOT NULL,
    ip_address VARCHAR(64),
    user_agent VARCHAR(512),
    metadata TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_events_user_created
    ON audit_events (user_id, created_at DESC);

CREATE INDEX idx_audit_events_type_created
    ON audit_events (event_type, created_at DESC);

COMMENT ON TABLE audit_events IS
    'Append-only audit trail of security-sensitive actions: login, admin role grant, IBAN change, payout-paid, account deletion.';
