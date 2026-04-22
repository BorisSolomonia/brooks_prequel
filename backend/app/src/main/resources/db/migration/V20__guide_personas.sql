CREATE TABLE guide_personas (
    guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
    persona  VARCHAR(30) NOT NULL CHECK (persona IN ('SOLO', 'FAMILY', 'BUDGET', 'LUXURY', 'DIGITAL_NOMAD')),
    PRIMARY KEY (guide_id, persona)
);
