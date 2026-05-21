-- V52 — fuzzy search via pg_trgm.
--
-- Current search uses Postgres FTS (search_vector @@ plainto_tsquery)
-- which is word-level and stemmed but does NOT tolerate typos. A user
-- typing "Tbilsi" (one missing letter) doesn't match guides in Tbilisi.
--
-- This migration enables pg_trgm and adds GIN trigram indexes on the
-- city / region / address / name columns the search hits. The
-- SearchRepository queries then OR `similarity(LOWER(col), LOWER(?))
-- >= 0.25` clauses alongside the existing tsvector match. Existing
-- behaviour (FTS + LIKE) is unchanged; trigram is additive.
--
-- pg_trgm is built into PostgreSQL since 9.1 and ships pre-installed
-- on Cloud SQL, RDS, and the official docker postgres images Brooks
-- uses (postgres:16-alpine). No bucket-level changes needed.
--
-- Idempotent: CREATE EXTENSION IF NOT EXISTS + CREATE INDEX IF NOT EXISTS.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Guides: city / region / country are the three columns city-style
-- queries can hit.
CREATE INDEX IF NOT EXISTS idx_guides_primary_city_trgm
    ON guides USING gin (LOWER(primary_city) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_guides_region_trgm
    ON guides USING gin (LOWER(region) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_guides_country_trgm
    ON guides USING gin (LOWER(country) gin_trgm_ops);

-- Places: an "address" can be free-text ("8 Ninoshvili Street, Tbilisi"),
-- and "name" is also a likely fuzzy target.
CREATE INDEX IF NOT EXISTS idx_guide_places_address_trgm
    ON guide_places USING gin (LOWER(address) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_guide_places_name_trgm
    ON guide_places USING gin (LOWER(name) gin_trgm_ops);

-- Creator profile region — for "creators in {city}" fuzzy match.
CREATE INDEX IF NOT EXISTS idx_user_profiles_region_trgm
    ON user_profiles USING gin (LOWER(region) gin_trgm_ops);
