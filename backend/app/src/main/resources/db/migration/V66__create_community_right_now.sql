-- BOR-86 "Right Now" — community-powered live location updates (v1: structured-status-only).
-- Design + DPIA: repo root BOR86_RIGHT_NOW_DESIGN.md.
-- PRIVACY INVARIANT: no table stores a responder's raw coordinate. Eligibility is proven
-- transiently (in-memory Haversine + dwell) and only booleans + a coarse status persist.

-- Curated public-POI gazetteer. Requests can ONLY target a row here (no free-form
-- coordinates/addresses), which makes targeting a private home or a person impossible.
CREATE TABLE community_places (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    category VARCHAR(60) NOT NULL,
    -- Only HIGH/MED footfall places enter Right Now v1; LOW stays excluded so a lone
    -- responder can never be de-anonymised (k-anonymity set of 1).
    footfall_class VARCHAR(10) NOT NULL DEFAULT 'MED' CHECK (footfall_class IN ('LOW','MED','HIGH')),
    -- The PLACE's public coordinate (not a person's). Used only to range-check eligibility.
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    -- Per-POI eligibility radius (place footprint); capped at 200m by the service.
    radius_meters INTEGER NOT NULL DEFAULT 50 CHECK (radius_meters > 0 AND radius_meters <= 200),
    public_card_allowed BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    excluded_reason VARCHAR(200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_community_places_location ON community_places(latitude, longitude);
CREATE INDEX idx_community_places_active ON community_places(is_active);

-- One open "asking" window per place; repeated asks dedupe into it (participants table).
CREATE TABLE right_now_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id UUID NOT NULL REFERENCES community_places(id) ON DELETE CASCADE,
    window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_right_now_requests_place ON right_now_requests(place_id);
CREATE INDEX idx_right_now_requests_active ON right_now_requests(place_id, expires_at);

-- Distinct askers — the demand counter is COUNT(DISTINCT asker), never a raw request count,
-- and it is surfaced bucketed (few/several/many). No location stored here.
CREATE TABLE right_now_request_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES right_now_requests(id) ON DELETE CASCADE,
    asker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (request_id, asker_id)
);

CREATE INDEX idx_right_now_participants_request ON right_now_request_participants(request_id);

-- A structured answer. NO free text and NO photo in v1 (deferred to v2 behind moderation).
-- author_id is SERVER-ONLY and must never be serialized to clients or public cards.
CREATE TABLE right_now_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id UUID NOT NULL REFERENCES community_places(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(10) NOT NULL CHECK (status IN ('QUIET','NORMAL','BUSY','CLOSED')),
    wait_bucket VARCHAR(20),
    -- A stored report is eligible by construction: the service rejects the submit unless the
    -- device proved presence (in radius) + attestation + dwell. Those coordinates are used in
    -- memory and discarded — nothing about them is persisted here.
    corroboration_count INTEGER NOT NULL DEFAULT 1,
    -- Optional public "Right Now" card (explicit consent, K_public-gated, status+age only).
    shared_public BOOLEAN NOT NULL DEFAULT FALSE,
    public_shared_at TIMESTAMPTZ,
    public_revoked_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    hidden_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    removed_reason VARCHAR(200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Feed read filters by place + liveness and sorts per-place; the by-status index serves the
-- corroboration counts. Both lead with place_id and are partial on the liveness predicate so
-- the near-constant deleted_at/hidden_at NULLs don't waste the index.
CREATE INDEX idx_right_now_reports_live ON right_now_reports(place_id, expires_at)
    WHERE deleted_at IS NULL AND hidden_at IS NULL;
CREATE INDEX idx_right_now_reports_status ON right_now_reports(place_id, status, expires_at)
    WHERE deleted_at IS NULL AND hidden_at IS NULL;
CREATE INDEX idx_right_now_reports_author ON right_now_reports(author_id);

-- Binary helpful vote. No self-vote (author_id != voter_id, enforced in service);
-- one vote per user per report (UNIQUE); rate-limited in service.
CREATE TABLE right_now_helpful_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES right_now_reports(id) ON DELETE CASCADE,
    voter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (report_id, voter_id)
);

CREATE INDEX idx_right_now_votes_report ON right_now_helpful_votes(report_id);

-- Report-a-response. Critical categories auto-hide the report pending human review.
CREATE TABLE right_now_report_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES right_now_reports(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(20) NOT NULL CHECK (category IN ('MISLEADING','OUTDATED','UNSAFE','HARASSMENT','ILLEGAL','OTHER')),
    state VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (state IN ('OPEN','ACTIONED','DISMISSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (report_id, reporter_id)
);

CREATE INDEX idx_right_now_flags_report ON right_now_report_flags(report_id);

-- Block-a-contributor: filters reads AND blocks reverse interaction (checked in service).
CREATE TABLE community_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (blocker_id, blocked_id),
    CHECK (blocker_id <> blocked_id)
);

CREATE INDEX idx_community_blocks_blocker ON community_blocks(blocker_id);
CREATE INDEX idx_community_blocks_blocked ON community_blocks(blocked_id);

-- Granular, un-pre-ticked consent ledger (GDPR / Georgia 2024 law). One row per purpose.
CREATE TABLE community_consent (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose VARCHAR(30) NOT NULL CHECK (purpose IN ('LOCATION_ELIGIBILITY','PUBLIC_CARD')),
    version INTEGER NOT NULL DEFAULT 1,
    granted_at TIMESTAMPTZ,
    withdrawn_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, purpose)
);

CREATE INDEX idx_community_consent_user ON community_consent(user_id);

-- Derived, anti-Sybil trust. Contributor exposure is a coarse tier only (never a per-report count).
CREATE TABLE contributor_trust (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    helpful_weighted DOUBLE PRECISION NOT NULL DEFAULT 0,
    tier VARCHAR(10) NOT NULL DEFAULT 'NONE' CHECK (tier IN ('NONE','TRUSTED')),
    recomputed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id)
);

CREATE INDEX idx_contributor_trust_user ON contributor_trust(user_id);

-- Immutable moderation audit trail.
CREATE TABLE community_moderation_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    target_report_id UUID REFERENCES right_now_reports(id) ON DELETE CASCADE,
    action VARCHAR(40) NOT NULL,
    reason VARCHAR(200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_community_moderation_target ON community_moderation_actions(target_report_id);
