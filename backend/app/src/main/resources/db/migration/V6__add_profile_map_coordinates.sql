ALTER TABLE user_profiles
    ADD COLUMN latitude DOUBLE PRECISION,
    ADD COLUMN longitude DOUBLE PRECISION;

CREATE INDEX idx_user_profiles_map_coordinates
    ON user_profiles (latitude, longitude);
