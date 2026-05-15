-- V47 — account-deletion bookkeeping
--
-- Adds two tables backing the Play Store / App Store data-deletion flow:
--
--   account_deletion_requests   public, unauthenticated "delete my data" requests
--                               keyed by a one-time token emailed to the user
--                               (email-sending wired separately later — for now
--                               an admin reads this table and processes manually)
--
--   account_deletions           audit log of every completed deletion.
--                               survives the 30-day backup purge so we can prove
--                               compliance to data regulators.
--
-- UserStatus.DELETED already exists in the enum, so users.status is the
-- soft-delete flag — no schema change required for the users table.

CREATE TABLE IF NOT EXISTS account_deletion_requests (
    token        VARCHAR(64) PRIMARY KEY,
    user_id      UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requested_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    expires_at   TIMESTAMPTZ  NOT NULL,
    used_at      TIMESTAMPTZ,
    -- Stored as TEXT (not INET) to keep Hibernate's default String binding
    -- working without a custom JdbcType. IP is for audit only; the format
    -- precision INET offers isn't needed.
    source_ip    TEXT,
    user_agent   TEXT,
    reason       TEXT,
    CONSTRAINT account_deletion_requests_expires_chk
        CHECK (expires_at > requested_at)
);

CREATE INDEX IF NOT EXISTS account_deletion_requests_user_id_idx
    ON account_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS account_deletion_requests_expires_idx
    ON account_deletion_requests(expires_at)
    WHERE used_at IS NULL;

CREATE TABLE IF NOT EXISTS account_deletions (
    id                BIGSERIAL    PRIMARY KEY,
    user_id           UUID         NOT NULL,
    -- sha256 of the lowercased email at time of deletion. Used for de-dup
    -- without retaining plaintext PII after the 30-day backup purge.
    hashed_email      VARCHAR(64)  NOT NULL,
    reason            TEXT,
    -- Provenance: 'INAPP' = authenticated user pressed Delete in Settings.
    --             'WEB'   = public web flow completed via email confirmation.
    --             'SUPPORT' = manually deleted by admin / support staff.
    source            VARCHAR(16)  NOT NULL,
    requested_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    -- Set by the 30-day backup purge job when it removes the soft-deleted row.
    hard_deleted_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS account_deletions_requested_idx
    ON account_deletions(requested_at);
CREATE INDEX IF NOT EXISTS account_deletions_user_id_idx
    ON account_deletions(user_id);
