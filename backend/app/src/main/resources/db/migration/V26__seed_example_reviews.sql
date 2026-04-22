-- V26: Seed example guide and creator reviews for existing mock data.

-- Ensure published guides have at least one snapshot version so seeded purchases can reference it.
INSERT INTO guide_versions (guide_id, version_number, snapshot, published_at)
SELECT
    g.id,
    g.version_number,
    jsonb_build_object(
        'id', g.id,
        'creatorId', g.creator_id,
        'title', g.title,
        'description', g.description,
        'coverImageUrl', g.cover_image_url,
        'region', g.region,
        'primaryCity', g.primary_city,
        'country', g.country,
        'priceCents', g.price_cents,
        'currency', g.currency,
        'status', g.status,
        'versionNumber', g.version_number,
        'dayCount', g.day_count,
        'placeCount', g.place_count,
        'generatedAt', now()
    ),
    COALESCE(g.updated_at, g.created_at, now())
FROM guides g
WHERE g.status = 'PUBLISHED'
  AND g.version_number > 0
  AND NOT EXISTS (
      SELECT 1
      FROM guide_versions gv
      WHERE gv.guide_id = g.id
        AND gv.version_number = g.version_number
  );

WITH purchase_seed AS (
    SELECT *
    FROM (
        VALUES
            ('f1000001-0000-4000-8000-000000000000'::uuid, 'a0000003-0000-4000-8000-000000000000'::uuid, 'b0000001-0000-4000-8000-000000000000'::uuid, TIMESTAMPTZ '2026-04-01 10:00:00+00', DATE '2026-04-18', DATE '2026-04-20', 'Europe/Rome'),
            ('f1000002-0000-4000-8000-000000000000'::uuid, 'a0000003-0000-4000-8000-000000000000'::uuid, 'b0000002-0000-4000-8000-000000000000'::uuid, TIMESTAMPTZ '2026-04-02 10:00:00+00', DATE '2026-05-02', DATE '2026-05-04', 'Europe/Rome'),
            ('f1000003-0000-4000-8000-000000000000'::uuid, 'a0000004-0000-4000-8000-000000000000'::uuid, 'b0000003-0000-4000-8000-000000000000'::uuid, TIMESTAMPTZ '2026-04-03 10:00:00+00', DATE '2026-04-25', DATE '2026-04-27', 'Asia/Tokyo'),
            ('f1000004-0000-4000-8000-000000000000'::uuid, 'a0000004-0000-4000-8000-000000000000'::uuid, 'b0000004-0000-4000-8000-000000000000'::uuid, TIMESTAMPTZ '2026-04-04 10:00:00+00', DATE '2026-04-28', DATE '2026-04-30', 'Asia/Tokyo'),
            ('f1000005-0000-4000-8000-000000000000'::uuid, 'a0000006-0000-4000-8000-000000000000'::uuid, 'b0000007-0000-4000-8000-000000000000'::uuid, TIMESTAMPTZ '2026-04-05 10:00:00+00', DATE '2026-05-10', DATE '2026-05-12', 'Africa/Johannesburg'),
            ('f1000006-0000-4000-8000-000000000000'::uuid, 'a0000006-0000-4000-8000-000000000000'::uuid, 'b0000008-0000-4000-8000-000000000000'::uuid, TIMESTAMPTZ '2026-04-06 10:00:00+00', DATE '2026-05-15', DATE '2026-05-17', 'Africa/Casablanca'),
            ('f1000007-0000-4000-8000-000000000000'::uuid, 'a0000008-0000-4000-8000-000000000000'::uuid, 'b0000012-0000-4000-8000-000000000000'::uuid, TIMESTAMPTZ '2026-04-07 10:00:00+00', DATE '2026-04-23', DATE '2026-04-25', 'Europe/Warsaw'),
            ('f1000008-0000-4000-8000-000000000000'::uuid, 'a0000008-0000-4000-8000-000000000000'::uuid, 'b0000013-0000-4000-8000-000000000000'::uuid, TIMESTAMPTZ '2026-04-08 10:00:00+00', DATE '2026-04-26', DATE '2026-04-27', 'Europe/Warsaw'),
            ('f1000009-0000-4000-8000-000000000000'::uuid, 'a0000001-0000-4000-8000-000000000000'::uuid, 'b0000015-0000-4000-8000-000000000000'::uuid, TIMESTAMPTZ '2026-04-09 10:00:00+00', DATE '2026-06-12', DATE '2026-06-14', 'Europe/Stockholm'),
            ('f1000010-0000-4000-8000-000000000000'::uuid, 'a0000001-0000-4000-8000-000000000000'::uuid, 'b0000016-0000-4000-8000-000000000000'::uuid, TIMESTAMPTZ '2026-04-10 10:00:00+00', DATE '2026-06-15', DATE '2026-06-16', 'Europe/Copenhagen'),
            ('f1000011-0000-4000-8000-000000000000'::uuid, 'a0000005-0000-4000-8000-000000000000'::uuid, 'b0000006-0000-4000-8000-000000000000'::uuid, TIMESTAMPTZ '2026-04-11 10:00:00+00', DATE '2026-05-05', DATE '2026-05-07', 'Europe/Lisbon'),
            ('f1000012-0000-4000-8000-000000000000'::uuid, 'a0000007-0000-4000-8000-000000000000'::uuid, 'b0000009-0000-4000-8000-000000000000'::uuid, TIMESTAMPTZ '2026-04-12 10:00:00+00', DATE '2026-05-20', DATE '2026-05-22', 'Asia/Makassar'),
            ('f1000013-0000-4000-8000-000000000000'::uuid, 'a0000010-0000-4000-8000-000000000000'::uuid, 'b0000011-0000-4000-8000-000000000000'::uuid, TIMESTAMPTZ '2026-04-13 10:00:00+00', DATE '2026-06-01', DATE '2026-06-03', 'America/Mexico_City'),
            ('f1000014-0000-4000-8000-000000000000'::uuid, 'a0000002-0000-4000-8000-000000000000'::uuid, 'b0000014-0000-4000-8000-000000000000'::uuid, TIMESTAMPTZ '2026-04-14 10:00:00+00', DATE '2026-05-08', DATE '2026-05-10', 'Asia/Kathmandu'),
            ('f1000015-0000-4000-8000-000000000000'::uuid, 'a0000009-0000-4000-8000-000000000000'::uuid, 'b0000017-0000-4000-8000-000000000000'::uuid, TIMESTAMPTZ '2026-04-15 10:00:00+00', DATE '2026-06-05', DATE '2026-06-07', 'America/New_York')
    ) AS seed(id, buyer_id, guide_id, created_at, trip_start_date, trip_end_date, trip_timezone)
)
INSERT INTO guide_purchases (
    id,
    created_at,
    updated_at,
    buyer_id,
    guide_id,
    guide_version_id,
    guide_version_number,
    provider,
    provider_session_id,
    amount_cents,
    currency,
    status,
    trip_start_date,
    trip_end_date,
    trip_timezone
)
SELECT
    seed.id,
    seed.created_at,
    seed.created_at,
    seed.buyer_id,
    seed.guide_id,
    gv.id,
    g.version_number,
    'SEEDED',
    NULL,
    g.price_cents,
    g.currency,
    'COMPLETED',
    seed.trip_start_date,
    seed.trip_end_date,
    seed.trip_timezone
FROM purchase_seed seed
JOIN guides g
    ON g.id = seed.guide_id
JOIN guide_versions gv
    ON gv.guide_id = g.id
   AND gv.version_number = g.version_number
ON CONFLICT (id) DO NOTHING;

INSERT INTO guide_reviews (
    id,
    guide_id,
    buyer_id,
    purchase_id,
    rating,
    review_text,
    created_at,
    updated_at,
    helpful_count,
    not_helpful_count
)
VALUES
    ('f2000001-0000-4000-8000-000000000000','b0000001-0000-4000-8000-000000000000','a0000003-0000-4000-8000-000000000000','f1000001-0000-4000-8000-000000000000',5,'Used day 2 almost exactly as written.' || E'\n' || 'The pacing between galleries and wine bars felt genuinely local.',TIMESTAMPTZ '2026-04-16 09:00:00+00',TIMESTAMPTZ '2026-04-16 09:00:00+00',2,0),
    ('f2000002-0000-4000-8000-000000000000','b0000003-0000-4000-8000-000000000000','a0000004-0000-4000-8000-000000000000','f1000003-0000-4000-8000-000000000000',5,'Finally a Tokyo guide that does not waste time on obvious stops. The neighborhood transitions were the strongest part.',TIMESTAMPTZ '2026-04-17 09:00:00+00',TIMESTAMPTZ '2026-04-17 09:00:00+00',1,0),
    ('f2000003-0000-4000-8000-000000000000','b0000007-0000-4000-8000-000000000000','a0000006-0000-4000-8000-000000000000','f1000005-0000-4000-8000-000000000000',4,'Excellent hotel and dinner choices. I wanted one more practical safety note for late-night transport, but the guide still delivered.',TIMESTAMPTZ '2026-04-18 09:00:00+00',TIMESTAMPTZ '2026-04-18 09:00:00+00',1,0),
    ('f2000004-0000-4000-8000-000000000000','b0000012-0000-4000-8000-000000000000','a0000008-0000-4000-8000-000000000000','f1000007-0000-4000-8000-000000000000',5,'The Kazimierz night sequence was perfect.' || E'\n' || 'Every stop felt earned, not algorithmic.',TIMESTAMPTZ '2026-04-19 09:00:00+00',TIMESTAMPTZ '2026-04-19 09:00:00+00',2,0),
    ('f2000005-0000-4000-8000-000000000000','b0000015-0000-4000-8000-000000000000','a0000001-0000-4000-8000-000000000000','f1000009-0000-4000-8000-000000000000',5,'I booked this for the design angle and got exactly that. The fika pacing made Stockholm feel calm instead of expensive.',TIMESTAMPTZ '2026-04-20 09:00:00+00',TIMESTAMPTZ '2026-04-20 09:00:00+00',1,1),
    ('f2000006-0000-4000-8000-000000000000','b0000006-0000-4000-8000-000000000000','a0000005-0000-4000-8000-000000000000','f1000011-0000-4000-8000-000000000000',4,'Very strong on value. I saved more than expected because the food picks were actually budget-friendly and still worth the detour.',TIMESTAMPTZ '2026-04-20 12:00:00+00',TIMESTAMPTZ '2026-04-20 12:00:00+00',0,0),
    ('f2000007-0000-4000-8000-000000000000','b0000009-0000-4000-8000-000000000000','a0000007-0000-4000-8000-000000000000','f1000012-0000-4000-8000-000000000000',4,'The coworking and cafe notes were useful, especially which areas feel productive for a full week instead of one afternoon.',TIMESTAMPTZ '2026-04-21 08:00:00+00',TIMESTAMPTZ '2026-04-21 08:00:00+00',0,0),
    ('f2000008-0000-4000-8000-000000000000','b0000011-0000-4000-8000-000000000000','a0000010-0000-4000-8000-000000000000','f1000013-0000-4000-8000-000000000000',5,'Traveling with children felt much easier after reading this. The transport and food stops were practical, not idealized.',TIMESTAMPTZ '2026-04-21 10:00:00+00',TIMESTAMPTZ '2026-04-21 10:00:00+00',0,0),
    ('f2000009-0000-4000-8000-000000000000','b0000014-0000-4000-8000-000000000000','a0000002-0000-4000-8000-000000000000','f1000014-0000-4000-8000-000000000000',4,'The city-before-the-trek framing is smart. A little more gear prep detail would make it perfect.',TIMESTAMPTZ '2026-04-21 12:00:00+00',TIMESTAMPTZ '2026-04-21 12:00:00+00',0,0),
    ('f2000010-0000-4000-8000-000000000000','b0000017-0000-4000-8000-000000000000','a0000009-0000-4000-8000-000000000000','f1000015-0000-4000-8000-000000000000',5,'Sharp, opinionated, and readable. The route through Lower Manhattan made the architecture story easy to follow.',TIMESTAMPTZ '2026-04-21 14:00:00+00',TIMESTAMPTZ '2026-04-21 14:00:00+00',0,0)
ON CONFLICT (guide_id, buyer_id) DO NOTHING;

INSERT INTO creator_reviews (
    id,
    creator_id,
    reviewer_id,
    rating,
    review_text,
    helpful_count,
    not_helpful_count,
    created_at,
    updated_at
)
VALUES
    ('f3000001-0000-4000-8000-000000000000','a0000001-0000-4000-8000-000000000000','a0000003-0000-4000-8000-000000000000',5,'Both Italy guides feel lived in. The recommendations are opinionated in a good way and the logistics stay believable.',2,0,TIMESTAMPTZ '2026-04-18 15:00:00+00',TIMESTAMPTZ '2026-04-18 15:00:00+00'),
    ('f3000002-0000-4000-8000-000000000000','a0000002-0000-4000-8000-000000000000','a0000004-0000-4000-8000-000000000000',5,'Yuki writes like someone protecting your time. After two guides, I trust the curation completely.',1,0,TIMESTAMPTZ '2026-04-19 15:00:00+00',TIMESTAMPTZ '2026-04-19 15:00:00+00'),
    ('f3000003-0000-4000-8000-000000000000','a0000004-0000-4000-8000-000000000000','a0000006-0000-4000-8000-000000000000',4,'James is very strong on premium stays and framing the city well. The voice is confident without sounding generic.',0,0,TIMESTAMPTZ '2026-04-20 15:00:00+00',TIMESTAMPTZ '2026-04-20 15:00:00+00'),
    ('f3000004-0000-4000-8000-000000000000','a0000007-0000-4000-8000-000000000000','a0000008-0000-4000-8000-000000000000',5,'Ana has range. One guide is food-heavy, the other is more historical, and both still sound like the same human being.',1,0,TIMESTAMPTZ '2026-04-21 15:00:00+00',TIMESTAMPTZ '2026-04-21 15:00:00+00'),
    ('f3000005-0000-4000-8000-000000000000','a0000009-0000-4000-8000-000000000000','a0000001-0000-4000-8000-000000000000',5,'Emma clearly understands how place, design, and pace connect. After two guides, the editorial voice feels very consistent.',2,0,TIMESTAMPTZ '2026-04-21 16:00:00+00',TIMESTAMPTZ '2026-04-21 16:00:00+00')
ON CONFLICT (creator_id, reviewer_id) DO NOTHING;

INSERT INTO guide_review_votes (
    id,
    guide_review_id,
    voter_id,
    vote_value,
    created_at,
    updated_at
)
VALUES
    ('f4000001-0000-4000-8000-000000000000','f2000001-0000-4000-8000-000000000000','a0000004-0000-4000-8000-000000000000','HELPFUL',TIMESTAMPTZ '2026-04-16 16:00:00+00',TIMESTAMPTZ '2026-04-16 16:00:00+00'),
    ('f4000002-0000-4000-8000-000000000000','f2000001-0000-4000-8000-000000000000','a0000006-0000-4000-8000-000000000000','HELPFUL',TIMESTAMPTZ '2026-04-16 17:00:00+00',TIMESTAMPTZ '2026-04-16 17:00:00+00'),
    ('f4000003-0000-4000-8000-000000000000','f2000002-0000-4000-8000-000000000000','a0000003-0000-4000-8000-000000000000','HELPFUL',TIMESTAMPTZ '2026-04-17 16:00:00+00',TIMESTAMPTZ '2026-04-17 16:00:00+00'),
    ('f4000004-0000-4000-8000-000000000000','f2000004-0000-4000-8000-000000000000','a0000001-0000-4000-8000-000000000000','HELPFUL',TIMESTAMPTZ '2026-04-19 16:00:00+00',TIMESTAMPTZ '2026-04-19 16:00:00+00'),
    ('f4000005-0000-4000-8000-000000000000','f2000004-0000-4000-8000-000000000000','a0000010-0000-4000-8000-000000000000','HELPFUL',TIMESTAMPTZ '2026-04-19 17:00:00+00',TIMESTAMPTZ '2026-04-19 17:00:00+00'),
    ('f4000006-0000-4000-8000-000000000000','f2000005-0000-4000-8000-000000000000','a0000002-0000-4000-8000-000000000000','NOT_HELPFUL',TIMESTAMPTZ '2026-04-20 16:00:00+00',TIMESTAMPTZ '2026-04-20 16:00:00+00'),
    ('f4000007-0000-4000-8000-000000000000','f2000005-0000-4000-8000-000000000000','a0000005-0000-4000-8000-000000000000','HELPFUL',TIMESTAMPTZ '2026-04-20 17:00:00+00',TIMESTAMPTZ '2026-04-20 17:00:00+00')
ON CONFLICT (guide_review_id, voter_id) DO NOTHING;

INSERT INTO creator_review_votes (
    id,
    creator_review_id,
    voter_id,
    vote_value,
    created_at,
    updated_at
)
VALUES
    ('f5000001-0000-4000-8000-000000000000','f3000001-0000-4000-8000-000000000000','a0000004-0000-4000-8000-000000000000','HELPFUL',TIMESTAMPTZ '2026-04-18 18:00:00+00',TIMESTAMPTZ '2026-04-18 18:00:00+00'),
    ('f5000002-0000-4000-8000-000000000000','f3000001-0000-4000-8000-000000000000','a0000005-0000-4000-8000-000000000000','HELPFUL',TIMESTAMPTZ '2026-04-18 19:00:00+00',TIMESTAMPTZ '2026-04-18 19:00:00+00'),
    ('f5000003-0000-4000-8000-000000000000','f3000002-0000-4000-8000-000000000000','a0000003-0000-4000-8000-000000000000','HELPFUL',TIMESTAMPTZ '2026-04-19 18:00:00+00',TIMESTAMPTZ '2026-04-19 18:00:00+00'),
    ('f5000004-0000-4000-8000-000000000000','f3000004-0000-4000-8000-000000000000','a0000001-0000-4000-8000-000000000000','HELPFUL',TIMESTAMPTZ '2026-04-21 18:00:00+00',TIMESTAMPTZ '2026-04-21 18:00:00+00'),
    ('f5000005-0000-4000-8000-000000000000','f3000005-0000-4000-8000-000000000000','a0000002-0000-4000-8000-000000000000','HELPFUL',TIMESTAMPTZ '2026-04-21 19:00:00+00',TIMESTAMPTZ '2026-04-21 19:00:00+00'),
    ('f5000006-0000-4000-8000-000000000000','f3000005-0000-4000-8000-000000000000','a0000003-0000-4000-8000-000000000000','HELPFUL',TIMESTAMPTZ '2026-04-21 20:00:00+00',TIMESTAMPTZ '2026-04-21 20:00:00+00')
ON CONFLICT (creator_review_id, voter_id) DO NOTHING;

UPDATE user_profiles p
SET purchase_count = COALESCE((
    SELECT COUNT(*)
    FROM guide_purchases gp
    WHERE gp.buyer_id = p.user_id
      AND gp.status = 'COMPLETED'
), 0);

UPDATE user_profiles p
SET creator_rating_average = COALESCE((
        SELECT AVG(cr.rating)::double precision
        FROM creator_reviews cr
        WHERE cr.creator_id = p.user_id
    ), 0),
    creator_review_count = COALESCE((
        SELECT COUNT(*)
        FROM creator_reviews cr
        WHERE cr.creator_id = p.user_id
    ), 0);
