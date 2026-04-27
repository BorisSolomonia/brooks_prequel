-- Place tags: each place can have multiple searchable labels
CREATE TABLE guide_place_tags (
    place_id UUID NOT NULL REFERENCES guide_places(id) ON DELETE CASCADE,
    tag      VARCHAR(100) NOT NULL
);
CREATE INDEX idx_guide_place_tags_place_id ON guide_place_tags(place_id);

-- Block duration hint (mirrors place-level suggestedDurationMinutes)
ALTER TABLE guide_blocks ADD COLUMN suggested_duration_minutes INTEGER;

-- Day cover image
ALTER TABLE guide_days ADD COLUMN image_url VARCHAR(2048);
