-- Right Now v2 · Phase A2 — free-text + preset Place Q&A. Design: RIGHT_NOW_V2_DESIGN.md §4.
-- Asking is REMOTE-allowed (D-2): no presence needed to ask. ANSWERING is present-only (§9.2).
-- Answers are ANONYMOUS (D-4): responder_id is SERVER-ONLY, never serialized. The person-
-- targeting guard (§9.1) rejects @handles/phones/emails in question text before it is stored.

CREATE TABLE place_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id UUID NOT NULL REFERENCES community_places(id) ON DELETE CASCADE,
    -- asker_id is server-only (abuse control); NEVER returned to clients — questions are anonymous.
    asker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body_text VARCHAR(140),                 -- free-text question (moderated); null for a pure preset
    preset_key VARCHAR(40),                 -- e.g. CROWDED / OPEN / WEATHER / WAIT; null for free text
    is_free_text BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(12) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','ANSWERED','EXPIRED')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (body_text IS NOT NULL OR preset_key IS NOT NULL)
);

CREATE INDEX idx_place_questions_live ON place_questions(place_id, expires_at);

CREATE TABLE place_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES place_questions(id) ON DELETE CASCADE,
    -- responder_id is server-only: answers are ANONYMOUS on read. Kept for moderation + the
    -- dormant value ledger (ANSWER_HELPFUL) attribution, never serialized to clients.
    responder_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body_text VARCHAR(280),                 -- free-text answer (moderated); optional
    status_chip VARCHAR(20),                -- optional quick condition, e.g. BUSY / QUIET
    presence_verified BOOLEAN NOT NULL DEFAULT TRUE,   -- true by construction (present-only submit)
    corroboration_count INTEGER NOT NULL DEFAULT 1,
    helpful_count INTEGER NOT NULL DEFAULT 0,
    hidden_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    removed_reason VARCHAR(200),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (body_text IS NOT NULL OR status_chip IS NOT NULL)
);

CREATE INDEX idx_place_answers_live ON place_answers(question_id, expires_at)
    WHERE hidden_at IS NULL AND deleted_at IS NULL;
CREATE INDEX idx_place_answers_responder ON place_answers(responder_id);

CREATE TABLE place_answer_helpful_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    answer_id UUID NOT NULL REFERENCES place_answers(id) ON DELETE CASCADE,
    voter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (answer_id, voter_id)
);

CREATE INDEX idx_place_answer_votes_answer ON place_answer_helpful_votes(answer_id);

CREATE TABLE place_answer_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    answer_id UUID NOT NULL REFERENCES place_answers(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(20) NOT NULL CHECK (category IN ('MISLEADING','OUTDATED','UNSAFE','HARASSMENT','ILLEGAL','OTHER')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (answer_id, reporter_id)
);

CREATE INDEX idx_place_answer_flags_answer ON place_answer_flags(answer_id);
