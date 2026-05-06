CREATE TABLE purchase_audit_events (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id  UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    event_type   VARCHAR(50) NOT NULL,
    occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    payload      TEXT
);
CREATE INDEX idx_purchase_audit_events_purchase ON purchase_audit_events(purchase_id);
CREATE INDEX idx_purchase_audit_events_type ON purchase_audit_events(event_type);
