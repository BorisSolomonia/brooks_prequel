-- Right Now v2 · Phase A1 — Location Moments (follower-scoped stories) + dormant value ledger.
-- Design + DPIA: repo root RIGHT_NOW_V2_DESIGN.md. Decisions: D-3 follower-scoped (NO public
-- place feed → the RedTeam's #1 stalking-oracle is designed out), D-5 Stories-first, D-6 payout
-- basis = helpfulness/follower-engagement (not raw public spectators), Q1 Tbilisi, Q2 photos.

-- ── Place gazetteer: search + sensitive-POI exclusion (prepared now, enforced later) ──────────
ALTER TABLE community_places ADD COLUMN IF NOT EXISTS city VARCHAR(120);
ALTER TABLE community_places ADD COLUMN IF NOT EXISTS country VARCHAR(80);
-- Q4: kid-related & sensitive POIs. `stories_excluded` is the launch-off enforcement toggle;
-- `sensitive_category` classifies WHY. Flipping enforcement on later needs no migration.
ALTER TABLE community_places ADD COLUMN IF NOT EXISTS stories_excluded BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE community_places ADD COLUMN IF NOT EXISTS sensitive_category VARCHAR(30);

-- Place search (D-2 remote asking, launch-scoped to Tbilisi): trigram on name + btree on city.
CREATE INDEX IF NOT EXISTS idx_community_places_name_trgm
    ON community_places USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_community_places_city ON community_places(city);

-- ── Location Moments — ephemeral 24h, follower-scoped, identified to the audience ─────────────
CREATE TABLE location_moments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id UUID NOT NULL REFERENCES community_places(id) ON DELETE CASCADE,
    -- author_id IS shown to the audience (stories are identified, unlike anonymous Q&A answers).
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    media_ref VARCHAR(500) NOT NULL,                         -- GCS object ref
    media_type VARCHAR(10) NOT NULL DEFAULT 'PHOTO' CHECK (media_type IN ('PHOTO','VIDEO')),
    caption VARCHAR(280),                                    -- free text → automated moderation (Q5)
    -- FOLLOWERS at launch; CLOSE_FOLLOWERS is schema-ready (Q3), UI deferred. NO PLACE_PUBLIC.
    visibility VARCHAR(20) NOT NULL DEFAULT 'FOLLOWERS'
        CHECK (visibility IN ('FOLLOWERS','CLOSE_FOLLOWERS')),
    delay_minutes INTEGER NOT NULL DEFAULT 0 CHECK (delay_minutes >= 0 AND delay_minutes <= 120),
    go_ghost BOOLEAN NOT NULL DEFAULT FALSE,                 -- author panic/hide toggle
    visible_at TIMESTAMPTZ NOT NULL,                         -- created_at + delay (jittered client-side)
    expires_at TIMESTAMPTZ NOT NULL,                         -- created_at + 24h
    taken_down_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_location_moments_place_live ON location_moments(place_id, visible_at, expires_at)
    WHERE taken_down_at IS NULL;
CREATE INDEX idx_location_moments_author ON location_moments(author_id, expires_at)
    WHERE taken_down_at IS NULL;

-- Close-followers narrowing (Q3): only rows here may see a CLOSE_FOLLOWERS moment. Empty at launch.
CREATE TABLE moment_audience (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    moment_id UUID NOT NULL REFERENCES location_moments(id) ON DELETE CASCADE,
    allowed_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (moment_id, allowed_user_id)
);

-- Follower-engagement ledger (the future "spectators" signal; a viewer must be a follower).
CREATE TABLE location_moment_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    moment_id UUID NOT NULL REFERENCES location_moments(id) ON DELETE CASCADE,
    viewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dwell_ms INTEGER,
    is_unique BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (moment_id, viewer_id)                            -- one unique-view row per viewer
);

CREATE INDEX idx_location_moment_views_moment ON location_moment_views(moment_id);

-- ── Dormant value ledger — BUILT NOW, PAID LATER (D-6). Append-only, fraud-forensic. ─────────
-- Payout logic is intentionally ABSENT. We only RECORD attributable value-events; the money
-- job + manual disbursement come later. Fraud is only provable from signals captured at emit
-- time, so the forensic columns exist from day one even though nothing reads them yet.
-- GDPR erasure: subject/actor are ON DELETE SET NULL → deleting a user tombstones the row
-- (keeps the append-only integer for aggregate integrity, drops the PII linkage). PII is
-- deliberately NOT a load-bearing primary key. Crypto-shred keying is the later hardening.
CREATE TABLE value_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(30) NOT NULL CHECK (event_type IN
        ('ANSWER_HELPFUL','ANSWER_CORROBORATED','MOMENT_VIEW','MOMENT_UNIQUE_VIEW','MOMENT_REACTION')),
    subject_user_id UUID REFERENCES users(id) ON DELETE SET NULL,   -- the earner (nullable-on-erasure)
    source_ref UUID,                                                -- moment_id / answer_id / question_id
    place_id UUID REFERENCES community_places(id) ON DELETE SET NULL,
    place_traffic_tier VARCHAR(10),                                 -- normalize per-place → kills hero-camping
    raw_dwell_ms INTEGER,                                           -- keep RAW; weight computed later
    client_reported BOOLEAN NOT NULL DEFAULT TRUE,
    foreground_verified BOOLEAN NOT NULL DEFAULT FALSE,
    session_id VARCHAR(80),
    epoch_id VARCHAR(20) NOT NULL,                                  -- payout period seal (e.g. 2026-08-12)
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,     -- who generated it (never paid)
    actor_device_id VARCHAR(120),
    actor_ip_hash VARCHAR(80),
    install_id VARCHAR(120),
    actor_account_age_days INTEGER,
    actor_trust_snapshot VARCHAR(10),
    idempotency_key TEXT NOT NULL UNIQUE,                           -- (type+source+actor) → no double count
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Retained directed actor→subject edge (collusion-ring detection) + per-earner rollups later.
CREATE INDEX idx_value_events_subject ON value_events(subject_user_id, epoch_id);
CREATE INDEX idx_value_events_actor_subject ON value_events(actor_user_id, subject_user_id);
CREATE INDEX idx_value_events_source ON value_events(source_ref);

-- ── Tbilisi hero places (Q1): seed a lively first city so the feed is never a ghost town. ─────
INSERT INTO community_places (name, category, footfall_class, latitude, longitude, radius_meters,
                              public_card_allowed, is_active, city, country)
VALUES
    ('Fabrika Tbilisi',   'cafe',     'HIGH', 41.704300, 44.801500, 150, TRUE, TRUE, 'Tbilisi', 'Georgia'),
    ('Rustaveli Avenue',  'landmark', 'HIGH', 41.700800, 44.796700, 200, TRUE, TRUE, 'Tbilisi', 'Georgia'),
    ('Dry Bridge Market', 'market',   'MED',  41.697500, 44.806000, 150, FALSE, TRUE, 'Tbilisi', 'Georgia'),
    ('Freedom Square',    'landmark', 'HIGH', 41.693400, 44.801600, 200, TRUE, TRUE, 'Tbilisi', 'Georgia')
ON CONFLICT DO NOTHING;

-- Backfill city on the earlier V67 test seed so it appears in Tbilisi search.
UPDATE community_places SET city = 'Tbilisi', country = 'Georgia'
    WHERE city IS NULL AND name IN ('My Test Spot','Rustaveli Avenue','Fabrika Tbilisi','Dry Bridge Market');
