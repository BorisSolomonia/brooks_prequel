-- Dedicated free guide checkout seed.
-- This replaces the earlier one-off free Lisbon override with one mock creator
-- who owns exactly two complete published free guides for end-to-end purchase tests.

UPDATE guides
SET price_cents = 900,
    currency = 'USD',
    updated_at = NOW()
WHERE id = 'b0000006-0000-4000-8000-000000000000';

UPDATE guide_versions
SET snapshot = jsonb_set(
    jsonb_set(snapshot, '{priceCents}', '900'::jsonb, true),
    '{currency}', '"USD"'::jsonb, true
)
WHERE guide_id = 'b0000006-0000-4000-8000-000000000000'
  AND version_number = 1;

INSERT INTO users (id, auth0_subject, email, username, role, status, onboarding_completed)
VALUES (
    'a1000001-0000-4000-8000-000000000000',
    'seed|brooks-free-test-creator',
    'free.guides@brooks.local',
    'free-guide-lab',
    'USER',
    'ACTIVE',
    TRUE
)
ON CONFLICT (auth0_subject) DO NOTHING;

INSERT INTO user_profiles (
    user_id,
    display_name,
    bio,
    avatar_url,
    region,
    interests,
    latitude,
    longitude,
    follower_count,
    following_count,
    guide_count,
    is_verified
)
VALUES (
    'a1000001-0000-4000-8000-000000000000',
    'Brooks Free Guide Lab',
    'A seeded creator used to test guide checkout, trip creation, map pins, itinerary flow, and calendar-ready guide content without payment.',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=320&q=80',
    'Tbilisi, Georgia',
    'test guides, city walks, food, planning',
    41.7151,
    44.8271,
    128,
    12,
    2,
    TRUE
)
ON CONFLICT (user_id) DO UPDATE
SET display_name = EXCLUDED.display_name,
    bio = EXCLUDED.bio,
    avatar_url = EXCLUDED.avatar_url,
    region = EXCLUDED.region,
    interests = EXCLUDED.interests,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    guide_count = EXCLUDED.guide_count,
    is_verified = EXCLUDED.is_verified;

INSERT INTO guides (
    id,
    creator_id,
    title,
    description,
    cover_image_url,
    region,
    primary_city,
    country,
    timezone,
    price_cents,
    currency,
    status,
    version_number,
    day_count,
    place_count,
    traveler_stage,
    best_season_start_month,
    best_season_end_month,
    best_season_label,
    latitude,
    longitude,
    sort_order
)
VALUES
    (
        'b1000001-0000-4000-8000-000000000000',
        'a1000001-0000-4000-8000-000000000000',
        'Free Test Guide: Tbilisi Old Town Walk',
        'A complete free checkout guide for testing the purchase flow: guide detail, free checkout, trip creation, map pins, itinerary scheduling, and calendar-ready places.',
        'https://images.unsplash.com/photo-1565008576549-57569a49371d?auto=format&fit=crop&w=1200&q=80',
        'Tbilisi Region',
        'Tbilisi',
        'Georgia',
        'Asia/Tbilisi',
        0,
        'USD',
        'PUBLISHED',
        1,
        2,
        8,
        'PLANNING',
        4,
        10,
        'Spring through autumn',
        41.7151,
        44.8271,
        1
    ),
    (
        'b1000002-0000-4000-8000-000000000000',
        'a1000001-0000-4000-8000-000000000000',
        'Free Test Guide: Batumi Rainy Day Route',
        'A second complete free guide for repeat checkout testing, already-owned handling, itinerary rendering, map pins, place images, tags, and transport notes.',
        'https://images.unsplash.com/photo-1589308454676-22da8f1b4a3f?auto=format&fit=crop&w=1200&q=80',
        'Adjara',
        'Batumi',
        'Georgia',
        'Asia/Tbilisi',
        0,
        'USD',
        'PUBLISHED',
        1,
        2,
        8,
        'EXPERIENCING',
        5,
        9,
        'Warm months and rainy afternoons',
        41.6168,
        41.6367,
        2
    )
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    description = EXCLUDED.description,
    cover_image_url = EXCLUDED.cover_image_url,
    region = EXCLUDED.region,
    primary_city = EXCLUDED.primary_city,
    country = EXCLUDED.country,
    timezone = EXCLUDED.timezone,
    price_cents = EXCLUDED.price_cents,
    currency = EXCLUDED.currency,
    status = EXCLUDED.status,
    version_number = EXCLUDED.version_number,
    day_count = EXCLUDED.day_count,
    place_count = EXCLUDED.place_count,
    traveler_stage = EXCLUDED.traveler_stage,
    best_season_start_month = EXCLUDED.best_season_start_month,
    best_season_end_month = EXCLUDED.best_season_end_month,
    best_season_label = EXCLUDED.best_season_label,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

INSERT INTO guide_tags (guide_id, tag)
VALUES
    ('b1000001-0000-4000-8000-000000000000','free-test'),
    ('b1000001-0000-4000-8000-000000000000','tbilisi'),
    ('b1000001-0000-4000-8000-000000000000','old-town'),
    ('b1000001-0000-4000-8000-000000000000','food'),
    ('b1000002-0000-4000-8000-000000000000','free-test'),
    ('b1000002-0000-4000-8000-000000000000','batumi'),
    ('b1000002-0000-4000-8000-000000000000','rainy-day'),
    ('b1000002-0000-4000-8000-000000000000','black-sea')
ON CONFLICT (guide_id, tag) DO NOTHING;

INSERT INTO guide_personas (guide_id, persona)
VALUES
    ('b1000001-0000-4000-8000-000000000000','SOLO'),
    ('b1000001-0000-4000-8000-000000000000','BUDGET'),
    ('b1000002-0000-4000-8000-000000000000','SOLO'),
    ('b1000002-0000-4000-8000-000000000000','FAMILY')
ON CONFLICT (guide_id, persona) DO NOTHING;

INSERT INTO guide_days (id, guide_id, day_number, title, description, image_url)
VALUES
    ('c1000001-0000-4000-8000-000000000000','b1000001-0000-4000-8000-000000000000',1,'Old Town, Sulfur Baths, and First Views','A practical first-day route through the walkable core, with food and viewpoints placed in a realistic order.','https://images.unsplash.com/photo-1565008576549-57569a49371d?auto=format&fit=crop&w=1200&q=80'),
    ('c1000002-0000-4000-8000-000000000000','b1000001-0000-4000-8000-000000000000',2,'Markets, Metro, and the Left Bank','A second day that tests transport, shopping, food, and a quieter neighborhood sequence.','https://images.unsplash.com/photo-1589196727442-191e8895e0f8?auto=format&fit=crop&w=1200&q=80'),
    ('c1000003-0000-4000-8000-000000000000','b1000002-0000-4000-8000-000000000000',1,'Boulevard, Coffee, and Indoor Backup Plans','A rain-friendly Batumi route that still keeps the sea visible and the walking distances sane.','https://images.unsplash.com/photo-1574781904312-77f0bc8dd531?auto=format&fit=crop&w=1200&q=80'),
    ('c1000004-0000-4000-8000-000000000000','b1000002-0000-4000-8000-000000000000',2,'Market Morning and Botanical Escape','A flexible second day with market food, a transport block, and a garden route if the weather clears.','https://images.unsplash.com/photo-1598940603846-a1edd0ef2574?auto=format&fit=crop&w=1200&q=80')
ON CONFLICT (guide_id, day_number) DO UPDATE
SET title = EXCLUDED.title,
    description = EXCLUDED.description,
    image_url = EXCLUDED.image_url,
    updated_at = NOW();

INSERT INTO guide_blocks (id, day_id, position, title, description, block_type, block_category, suggested_start_minute, suggested_duration_minutes)
VALUES
    ('d1000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000',1,'Morning Old Town Walk','Start early while the lanes are quiet, then climb for a first orientation view.','ACTIVITY','ACTIVITY',540,120),
    ('d1000002-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000',2,'Lunch and Sulfur Bath Logistics','A food stop and a practical bathhouse choice that tests accommodation-style notes and booking advice.','ACTIVITY','SECRET',720,150),
    ('d1000003-0000-4000-8000-000000000000','c1000002-0000-4000-8000-000000000000',1,'Dry Bridge and Market Loop','A shopping-heavy block with precise pins and enough detail for map testing.','ACTIVITY','SHOPPING',600,120),
    ('d1000004-0000-4000-8000-000000000000','c1000002-0000-4000-8000-000000000000',2,'Metro to Marjanishvili','Transport, coffee, and dinner in one sequence for trip-item scheduling tests.','ACTIVITY','TRANSPORT',780,180),
    ('d1000005-0000-4000-8000-000000000000','c1000003-0000-4000-8000-000000000000',1,'Boulevard Between Showers','A short outside walk with indoor stops close enough to avoid bad weather.','ACTIVITY','ACTIVITY',600,120),
    ('d1000006-0000-4000-8000-000000000000','c1000003-0000-4000-8000-000000000000',2,'Rain Plan: Coffee and Museum','Indoor anchors for a route that should still feel like Batumi.','ACTIVITY','SAFETY',750,150),
    ('d1000007-0000-4000-8000-000000000000','c1000004-0000-4000-8000-000000000000',1,'Market Breakfast and Local Food','Food stops with exact coordinates and useful short descriptions.','ACTIVITY','ACTIVITY',570,120),
    ('d1000008-0000-4000-8000-000000000000','c1000004-0000-4000-8000-000000000000',2,'Botanical Garden Transport','A transport-oriented block that tests calendar durations and map spread.','ACTIVITY','TRANSPORT',780,180)
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    description = EXCLUDED.description,
    block_type = EXCLUDED.block_type,
    block_category = EXCLUDED.block_category,
    suggested_start_minute = EXCLUDED.suggested_start_minute,
    suggested_duration_minutes = EXCLUDED.suggested_duration_minutes,
    updated_at = NOW();

INSERT INTO guide_places (id, block_id, position, name, description, address, latitude, longitude, category, price_level, suggested_start_minute, suggested_duration_minutes)
VALUES
    ('e1000001-0000-4000-8000-000000000000','d1000001-0000-4000-8000-000000000000',1,'Narikala Fortress','The easiest first overview of Old Tbilisi, best before the cable car queue forms.','Narikala Fortress, Tbilisi',41.6880,44.8086,'ATTRACTION',0,540,60),
    ('e1000002-0000-4000-8000-000000000000','d1000001-0000-4000-8000-000000000000',2,'Leghvtakhevi Waterfall','A compact gorge walk that proves the old town pins are precise.','Leghvtakhevi, Tbilisi',41.6886,44.8097,'ATTRACTION',0,610,45),
    ('e1000003-0000-4000-8000-000000000000','d1000002-0000-4000-8000-000000000000',1,'Racha Dukhan','A reliable budget lunch stop close enough to the bath district.','Lermontov Street, Tbilisi',41.6927,44.8045,'RESTAURANT',1,720,60),
    ('e1000004-0000-4000-8000-000000000000','d1000002-0000-4000-8000-000000000000',2,'Chreli Abano','A sulfur bathhouse pin for testing paid-style itinerary details inside a free guide.','Abano Street, Tbilisi',41.6885,44.8112,'WELLNESS',2,795,90),
    ('e1000005-0000-4000-8000-000000000000','d1000003-0000-4000-8000-000000000000',1,'Dry Bridge Market','Best for Soviet objects, books, and paintings; skip if it is raining hard.','Dry Bridge, Tbilisi',41.7031,44.8029,'MARKET',1,600,75),
    ('e1000006-0000-4000-8000-000000000000','d1000003-0000-4000-8000-000000000000',2,'9 Mta Gallery','A calm design stop near the market that makes the route feel less generic.','Galaktion Tabidze Street, Tbilisi',41.6936,44.8019,'SHOPPING',2,690,45),
    ('e1000007-0000-4000-8000-000000000000','d1000004-0000-4000-8000-000000000000',1,'Rustaveli Metro','Use the metro once so the trip plan tests transport instructions.','Rustaveli Metro Station, Tbilisi',41.7048,44.7895,'TRANSPORT',0,780,20),
    ('e1000008-0000-4000-8000-000000000000','d1000004-0000-4000-8000-000000000000',2,'Fabrika Courtyard','Coffee, dinner, and a useful reset point on the left bank.','8 Egnate Ninoshvili Street, Tbilisi',41.7098,44.8028,'CAFE',2,830,90),
    ('e1000009-0000-4000-8000-000000000000','d1000005-0000-4000-8000-000000000000',1,'Batumi Boulevard','A flat, easy first walk with frequent places to duck inside.','Batumi Boulevard, Batumi',41.6504,41.6367,'ATTRACTION',0,600,60),
    ('e1000010-0000-4000-8000-000000000000','d1000005-0000-4000-8000-000000000000',2,'Ali and Nino Statue','A precise waterfront pin and an obvious meeting point for shared trips.','Miracle Park, Batumi',41.6559,41.6410,'ATTRACTION',0,675,35),
    ('e1000011-0000-4000-8000-000000000000','d1000006-0000-4000-8000-000000000000',1,'Rhino Coffee','A reliable indoor coffee stop when the weather turns.','Batumi, Georgia',41.6468,41.6360,'CAFE',2,750,60),
    ('e1000012-0000-4000-8000-000000000000','d1000006-0000-4000-8000-000000000000',2,'Adjara Art Museum','Small enough for a rainy afternoon, useful for testing museum-category pins.','8 Zurab Gorgiladze Street, Batumi',41.6480,41.6308,'MUSEUM',1,825,75),
    ('e1000013-0000-4000-8000-000000000000','d1000007-0000-4000-8000-000000000000',1,'Batumi Fish Market','Choose fish, then walk it to a nearby kitchen; this tests food route details well.','Batumi Fish Market, Batumi',41.6497,41.6687,'MARKET',2,570,75),
    ('e1000014-0000-4000-8000-000000000000','d1000007-0000-4000-8000-000000000000',2,'Retro Batumi','Adjarian khachapuri in a practical central location.','54/62 Zurab Gorgiladze Street, Batumi',41.6448,41.6264,'RESTAURANT',1,665,60),
    ('e1000015-0000-4000-8000-000000000000','d1000008-0000-4000-8000-000000000000',1,'Batumi Central Bus Stop','A practical transport pin for getting north without overpaying for taxis.','Batumi, Georgia',41.6433,41.6400,'TRANSPORT',0,780,30),
    ('e1000016-0000-4000-8000-000000000000','d1000008-0000-4000-8000-000000000000',2,'Batumi Botanical Garden','The weather-clear payoff: sea views, long paths, and enough distance to test map bounds.','Mtsvane Kontskhi, Batumi',41.6946,41.7072,'GARDEN',2,840,120)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    address = EXCLUDED.address,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    category = EXCLUDED.category,
    price_level = EXCLUDED.price_level,
    suggested_start_minute = EXCLUDED.suggested_start_minute,
    suggested_duration_minutes = EXCLUDED.suggested_duration_minutes,
    updated_at = NOW();

INSERT INTO guide_place_tags (place_id, tag)
VALUES
    ('e1000001-0000-4000-8000-000000000000','viewpoint'),
    ('e1000002-0000-4000-8000-000000000000','walk'),
    ('e1000003-0000-4000-8000-000000000000','budget-food'),
    ('e1000004-0000-4000-8000-000000000000','wellness'),
    ('e1000005-0000-4000-8000-000000000000','market'),
    ('e1000006-0000-4000-8000-000000000000','design'),
    ('e1000007-0000-4000-8000-000000000000','metro'),
    ('e1000008-0000-4000-8000-000000000000','coffee'),
    ('e1000009-0000-4000-8000-000000000000','seaside'),
    ('e1000010-0000-4000-8000-000000000000','landmark'),
    ('e1000011-0000-4000-8000-000000000000','rain-plan'),
    ('e1000012-0000-4000-8000-000000000000','museum'),
    ('e1000013-0000-4000-8000-000000000000','fish'),
    ('e1000014-0000-4000-8000-000000000000','khachapuri'),
    ('e1000015-0000-4000-8000-000000000000','transport'),
    ('e1000016-0000-4000-8000-000000000000','garden');

INSERT INTO guide_place_images (id, place_id, image_url, caption, position)
VALUES
    ('f4000001-0000-4000-8000-000000000000','e1000001-0000-4000-8000-000000000000','https://images.unsplash.com/photo-1565008576549-57569a49371d?auto=format&fit=crop&w=900&q=80','Old Tbilisi from above',0),
    ('f4000002-0000-4000-8000-000000000000','e1000003-0000-4000-8000-000000000000','https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=80','Simple lunch stop',0),
    ('f4000003-0000-4000-8000-000000000000','e1000005-0000-4000-8000-000000000000','https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?auto=format&fit=crop&w=900&q=80','Market objects and books',0),
    ('f4000004-0000-4000-8000-000000000000','e1000008-0000-4000-8000-000000000000','https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=900&q=80','Coffee courtyard',0),
    ('f4000005-0000-4000-8000-000000000000','e1000009-0000-4000-8000-000000000000','https://images.unsplash.com/photo-1574781904312-77f0bc8dd531?auto=format&fit=crop&w=900&q=80','Boulevard walk',0),
    ('f4000006-0000-4000-8000-000000000000','e1000011-0000-4000-8000-000000000000','https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80','Rainy day coffee',0),
    ('f4000007-0000-4000-8000-000000000000','e1000013-0000-4000-8000-000000000000','https://images.unsplash.com/photo-1534766555764-ce878a5e3a2b?auto=format&fit=crop&w=900&q=80','Fish market choice',0),
    ('f4000008-0000-4000-8000-000000000000','e1000016-0000-4000-8000-000000000000','https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80','Garden paths',0)
ON CONFLICT (id) DO NOTHING;

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
        'timezone', g.timezone,
        'priceCents', g.price_cents,
        'salePriceCents', g.sale_price_cents,
        'saleEndsAt', g.sale_ends_at,
        'effectivePriceCents', g.price_cents,
        'currency', g.currency,
        'status', g.status,
        'versionNumber', g.version_number,
        'dayCount', g.day_count,
        'placeCount', g.place_count,
        'displayLocation', CONCAT_WS(', ', g.primary_city, g.country),
        'spotCount', g.place_count,
        'averageRating', 0,
        'reviewCount', 0,
        'weeklyPopularityScore', 0,
        'popularThisWeek', false,
        'tags', COALESCE((SELECT jsonb_agg(gt.tag ORDER BY gt.tag) FROM guide_tags gt WHERE gt.guide_id = g.id), '[]'::jsonb),
        'days', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', gd.id,
                    'dayNumber', gd.day_number,
                    'title', gd.title,
                    'description', gd.description,
                    'imageUrl', gd.image_url,
                    'blocks', COALESCE((
                        SELECT jsonb_agg(
                            jsonb_build_object(
                                'id', gb.id,
                                'position', gb.position,
                                'title', gb.title,
                                'description', gb.description,
                                'blockType', gb.block_type,
                                'blockCategory', gb.block_category,
                                'suggestedStartMinute', gb.suggested_start_minute,
                                'suggestedDurationMinutes', gb.suggested_duration_minutes,
                                'places', COALESCE((
                                    SELECT jsonb_agg(
                                        jsonb_build_object(
                                            'id', gp.id,
                                            'position', gp.position,
                                            'name', gp.name,
                                            'description', gp.description,
                                            'address', gp.address,
                                            'latitude', gp.latitude,
                                            'longitude', gp.longitude,
                                            'googlePlaceId', gp.google_place_id,
                                            'category', gp.category,
                                            'priceLevel', gp.price_level,
                                            'suggestedStartMinute', gp.suggested_start_minute,
                                            'suggestedDurationMinutes', gp.suggested_duration_minutes,
                                            'sponsored', gp.is_sponsored,
                                            'images', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', gpi.id, 'imageUrl', gpi.image_url, 'caption', gpi.caption, 'position', gpi.position) ORDER BY gpi.position) FROM guide_place_images gpi WHERE gpi.place_id = gp.id), '[]'::jsonb),
                                            'tags', COALESCE((SELECT jsonb_agg(gpt.tag ORDER BY gpt.tag) FROM guide_place_tags gpt WHERE gpt.place_id = gp.id), '[]'::jsonb)
                                        )
                                        ORDER BY gp.position
                                    )
                                    FROM guide_places gp
                                    WHERE gp.block_id = gb.id
                                ), '[]'::jsonb)
                            )
                            ORDER BY gb.position
                        )
                        FROM guide_blocks gb
                        WHERE gb.day_id = gd.id
                    ), '[]'::jsonb)
                )
                ORDER BY gd.day_number
            )
            FROM guide_days gd
            WHERE gd.guide_id = g.id
        ), '[]'::jsonb),
        'createdAt', g.created_at,
        'updatedAt', g.updated_at,
        'travelerStage', g.traveler_stage,
        'personas', COALESCE((SELECT jsonb_agg(gp.persona ORDER BY gp.persona) FROM guide_personas gp WHERE gp.guide_id = g.id), '[]'::jsonb),
        'bestSeasonStartMonth', g.best_season_start_month,
        'bestSeasonEndMonth', g.best_season_end_month,
        'bestSeasonLabel', g.best_season_label,
        'latitude', g.latitude,
        'longitude', g.longitude
    ),
    NOW()
FROM guides g
WHERE g.id IN (
    'b1000001-0000-4000-8000-000000000000',
    'b1000002-0000-4000-8000-000000000000'
)
ON CONFLICT (guide_id, version_number) DO UPDATE
SET snapshot = EXCLUDED.snapshot,
    published_at = EXCLUDED.published_at;
