-- Companion to V32 (BOG iPay column transition). Per stakeholder decision to wipe
-- existing purchase data (no production purchases yet) and pin currency to GEL,
-- which is the only currency BOG iPay supports.

-- Wipe dependent earnings first, then purchases.
TRUNCATE TABLE creator_earnings RESTART IDENTITY CASCADE;
TRUNCATE TABLE purchases RESTART IDENTITY CASCADE;

-- BOG iPay supports GEL only.
ALTER TABLE purchases ALTER COLUMN currency SET DEFAULT 'GEL';
