-- V51 — backfill usernames for accounts with NULL username.
--
-- Why this exists:
--   Until 2026-05-20 the signup path (UserService.findOrCreateUser) never
--   set a username on new accounts. The field stayed NULL until/unless the
--   user explicitly picked a handle via the profile editor — which most
--   never did. Notification listeners then leaked the synthetic email
--   local-part ("@google-oauth2_<sub_id>") into bell rows, and follow
--   notifications had no username to deep-link to.
--
--   Code now self-heals on every login (UserService assigns a generated
--   username when it sees one missing). This migration plugs the same
--   logic for existing rows so notifications fire correctly TODAY
--   without waiting for each user to log back in.
--
-- Strategy mirrors UserService.generateUniqueUsername:
--   1. If email is real (NOT @noemail.brooks.local): sanitised
--      lowercase local-part, max 30 chars
--   2. Otherwise: "user_" + md5(auth0_subject) first 8 chars
--   3. Collisions resolved by appending _1, _2, ... per row
--
-- Idempotent: only touches rows where username IS NULL. Safe to re-run.

DO $$
DECLARE
    rec RECORD;
    base_name TEXT;
    candidate TEXT;
    collision_suffix INT;
BEGIN
    FOR rec IN
        SELECT id, auth0_subject, email
        FROM users
        WHERE username IS NULL OR username = ''
        ORDER BY created_at NULLS FIRST  -- deterministic when many to fix at once
    LOOP
        IF rec.email LIKE '%@noemail.brooks.local' OR rec.email IS NULL THEN
            base_name := 'user_' || SUBSTRING(MD5(COALESCE(rec.auth0_subject, rec.id::text)), 1, 8);
        ELSE
            base_name := LOWER(REGEXP_REPLACE(SPLIT_PART(rec.email, '@', 1), '[^a-z0-9_-]+', '_', 'g'));
            base_name := LEFT(base_name, 30);
        END IF;

        IF base_name IS NULL OR base_name = '' OR base_name = '_' THEN
            base_name := 'user';
        END IF;

        candidate := base_name;
        collision_suffix := 0;
        WHILE EXISTS (SELECT 1 FROM users WHERE username = candidate) LOOP
            collision_suffix := collision_suffix + 1;
            candidate := base_name || '_' || collision_suffix;
            EXIT WHEN collision_suffix > 9999;  -- give up, take a hash suffix
        END LOOP;
        IF collision_suffix > 9999 THEN
            candidate := base_name || '_' || SUBSTRING(MD5(rec.id::text), 1, 8);
        END IF;

        UPDATE users SET username = candidate WHERE id = rec.id;
    END LOOP;
END $$;
