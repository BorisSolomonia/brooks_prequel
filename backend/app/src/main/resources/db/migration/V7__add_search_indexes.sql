-- ============================================================
-- V7: Full-text search vectors, GIN indexes, auto-update triggers
-- ============================================================

-- 1. user_profiles: search_vector over username (from users), display_name, bio, region
ALTER TABLE user_profiles ADD COLUMN search_vector tsvector;

CREATE INDEX idx_user_profiles_search ON user_profiles USING gin(search_vector);

-- Populate existing rows
UPDATE user_profiles p
SET search_vector = to_tsvector('english',
    coalesce((SELECT username FROM users u WHERE u.id = p.user_id), '') || ' ' ||
    coalesce(p.display_name, '') || ' ' ||
    coalesce(p.bio, '') || ' ' ||
    coalesce(p.region, '')
);

-- Trigger function for user_profiles
CREATE OR REPLACE FUNCTION user_profiles_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := to_tsvector('english',
        coalesce((SELECT username FROM users u WHERE u.id = NEW.user_id), '') || ' ' ||
        coalesce(NEW.display_name, '') || ' ' ||
        coalesce(NEW.bio, '') || ' ' ||
        coalesce(NEW.region, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_profiles_search_vector
    BEFORE INSERT OR UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION user_profiles_search_vector_update();

-- 2. guides: search_vector over title, description, region, primary_city, country
ALTER TABLE guides ADD COLUMN search_vector tsvector;

CREATE INDEX idx_guides_search ON guides USING gin(search_vector);

UPDATE guides
SET search_vector = to_tsvector('english',
    coalesce(title, '') || ' ' ||
    coalesce(description, '') || ' ' ||
    coalesce(region, '') || ' ' ||
    coalesce(primary_city, '') || ' ' ||
    coalesce(country, '')
);

CREATE OR REPLACE FUNCTION guides_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := to_tsvector('english',
        coalesce(NEW.title, '') || ' ' ||
        coalesce(NEW.description, '') || ' ' ||
        coalesce(NEW.region, '') || ' ' ||
        coalesce(NEW.primary_city, '') || ' ' ||
        coalesce(NEW.country, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_guides_search_vector
    BEFORE INSERT OR UPDATE ON guides
    FOR EACH ROW EXECUTE FUNCTION guides_search_vector_update();

-- 3. guide_places: search_vector over name, description, address, category
ALTER TABLE guide_places ADD COLUMN search_vector tsvector;

CREATE INDEX idx_guide_places_search ON guide_places USING gin(search_vector);

UPDATE guide_places
SET search_vector = to_tsvector('english',
    coalesce(name, '') || ' ' ||
    coalesce(description, '') || ' ' ||
    coalesce(address, '') || ' ' ||
    coalesce(category, '')
);

CREATE OR REPLACE FUNCTION guide_places_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := to_tsvector('english',
        coalesce(NEW.name, '') || ' ' ||
        coalesce(NEW.description, '') || ' ' ||
        coalesce(NEW.address, '') || ' ' ||
        coalesce(NEW.category, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_guide_places_search_vector
    BEFORE INSERT OR UPDATE ON guide_places
    FOR EACH ROW EXECUTE FUNCTION guide_places_search_vector_update();

-- 4. Composite index for regional ranking queries
CREATE INDEX idx_user_profiles_regional_ranking
    ON user_profiles(region, follower_count DESC, guide_count DESC);

-- 5. Index on guide_tags(tag) for tag-based filtering
CREATE INDEX idx_guide_tags_tag ON guide_tags(tag);
