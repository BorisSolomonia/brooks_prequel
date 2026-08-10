-- BOR-86 "Right Now" — seed test places so the feed is not empty during QA.
-- The page lists places within ~2 km of the phone's GPS; SUBMITTING a report
-- requires standing within a place's radius_meters (capped at 200m). Seed at
-- least one place near where YOU will physically test.
--
-- footfall_class MUST be 'MED' or 'HIGH' — 'LOW' places are excluded from v1
-- (k-anonymity). radius_meters must be > 0 and <= 200.
--
-- >>> EDIT the first row's latitude/longitude to YOUR current location before
-- >>> testing report submission. The other rows are central Tbilisi landmarks
-- >>> for browse/ask testing. Coordinates are decimal degrees (Google Maps: right
-- >>> click your spot -> the first number is latitude, the second is longitude).

INSERT INTO community_places (name, category, footfall_class, latitude, longitude, radius_meters, public_card_allowed, is_active)
VALUES
    -- ▼▼▼ Boris's real test location (set 2026-08-10). radius 200m = max allowed. ▼▼▼
    ('My Test Spot',        'cafe',       'HIGH', 41.705637, 44.771001, 200, TRUE, TRUE),
    -- ▲▲▲ stand within ~200m of this point to submit a report ▲▲▲
    ('Rustaveli Avenue',    'landmark',   'HIGH', 41.7008, 44.7967, 200, TRUE,  TRUE),
    ('Fabrika Tbilisi',     'cafe',       'HIGH', 41.7043, 44.8015, 150, TRUE,  TRUE),
    ('Dry Bridge Market',   'market',     'MED',  41.6975, 44.8060, 150, FALSE, TRUE);
