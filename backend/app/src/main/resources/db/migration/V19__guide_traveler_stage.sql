ALTER TABLE guides ADD COLUMN traveler_stage VARCHAR(20)
    CHECK (traveler_stage IN ('DREAMING', 'PLANNING', 'EXPERIENCING'));
