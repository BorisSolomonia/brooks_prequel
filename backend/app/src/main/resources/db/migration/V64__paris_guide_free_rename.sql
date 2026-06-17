-- BOR-72 follow-up: make the seeded Paris guide FREE and remove every reference to
-- the source author's name from user-facing content (creator name + username,
-- guide title + description, and the place notes that quoted them). Then rebuild
-- the version snapshot so guide detail / preview reflect the new text + price.
-- Forward migration (V63 is already applied; never edit an applied migration).

UPDATE users
SET username = 'paris-local-guide',
    email = 'paris.local@brooks.local'
WHERE id = 'a2000072-0000-4000-8000-000000000000';

UPDATE user_profiles
SET display_name = 'Paris Local Guide'
WHERE user_id = 'a2000072-0000-4000-8000-000000000000';

UPDATE guides
SET title = 'Paris Like a Local: A 4-Day Insider Walk Through the Real City',
    description = 'A curated 4-day Paris itinerary blending the unmissable landmarks with the specialty coffee bars, handwritten-menu bistros, and offbeat neighborhoods Parisians actually love. Follow it block by block and you''ll see the postcard Paris and the lived-in one on the same day.',
    price_cents = 0,
    updated_at = NOW()
WHERE id = 'b2000072-0000-4000-8000-000000000000';

UPDATE guide_places
SET description = 'The little tree-shaded point at the western tip of the island, just below Pont Neuf. It''s the best spot to be when the sun starts to set: face Notre-Dame and you get one of the loveliest views in Paris with the river splitting around you.'
WHERE id = 'e2000072-0000-4000-8000-000000000003';

UPDATE guide_places
SET description = 'A small bar strictly for people who come for the coffee itself, no croissants, no pastries, just four to six rare single-origin filters with an always-interesting choice. It ranks among the best in Paris: a place for connoisseurs.'
WHERE id = 'e2000072-0000-4000-8000-000000000023';

UPDATE guide_places
SET description = 'Paris does oysters brilliantly, and the trick is to skip the tourist spots where they''re expensive and dull. Behind Bastille on Rue d''Aligre, this little fishmonger does six oysters and a glass of white for around twelve euros, fresh, cheap and exactly right; pick whichever variety you like best.'
WHERE id = 'e2000072-0000-4000-8000-000000000030';

-- Rebuild the version snapshot from the now-updated rows (same shape as V63).
INSERT INTO guide_versions (guide_id, version_number, snapshot, published_at)
SELECT g.id, g.version_number,
    jsonb_build_object(
        'id', g.id, 'creatorId', g.creator_id, 'title', g.title, 'description', g.description,
        'coverImageUrl', g.cover_image_url, 'region', g.region, 'primaryCity', g.primary_city,
        'country', g.country, 'timezone', g.timezone, 'priceCents', g.price_cents,
        'salePriceCents', g.sale_price_cents, 'saleEndsAt', g.sale_ends_at, 'effectivePriceCents', g.price_cents,
        'currency', g.currency, 'status', g.status, 'versionNumber', g.version_number,
        'dayCount', g.day_count, 'placeCount', g.place_count,
        'displayLocation', CONCAT_WS(', ', g.primary_city, g.country), 'spotCount', g.place_count,
        'averageRating', 0, 'reviewCount', 0, 'weeklyPopularityScore', 0, 'popularThisWeek', false,
        'tags', COALESCE((SELECT jsonb_agg(gt.tag ORDER BY gt.tag) FROM guide_tags gt WHERE gt.guide_id = g.id), '[]'::jsonb),
        'days', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'id', gd.id, 'dayNumber', gd.day_number, 'title', gd.title, 'description', gd.description, 'imageUrl', gd.image_url,
                'blocks', COALESCE((
                    SELECT jsonb_agg(jsonb_build_object(
                        'id', gb.id, 'position', gb.position, 'title', gb.title, 'description', gb.description,
                        'blockType', gb.block_type, 'blockCategory', gb.block_category,
                        'suggestedStartMinute', gb.suggested_start_minute, 'suggestedDurationMinutes', gb.suggested_duration_minutes,
                        'places', COALESCE((
                            SELECT jsonb_agg(jsonb_build_object(
                                'id', gp.id, 'position', gp.position, 'name', gp.name, 'description', gp.description, 'address', gp.address,
                                'latitude', gp.latitude, 'longitude', gp.longitude, 'googlePlaceId', gp.google_place_id,
                                'category', gp.category, 'priceLevel', gp.price_level,
                                'suggestedStartMinute', gp.suggested_start_minute, 'suggestedDurationMinutes', gp.suggested_duration_minutes,
                                'sponsored', gp.is_sponsored,
                                'images', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', gpi.id, 'imageUrl', gpi.image_url, 'caption', gpi.caption, 'position', gpi.position) ORDER BY gpi.position) FROM guide_place_images gpi WHERE gpi.place_id = gp.id), '[]'::jsonb),
                                'tags', COALESCE((SELECT jsonb_agg(gpt.tag ORDER BY gpt.tag) FROM guide_place_tags gpt WHERE gpt.place_id = gp.id), '[]'::jsonb)
                            ) ORDER BY gp.position) FROM guide_places gp WHERE gp.block_id = gb.id
                        ), '[]'::jsonb)
                    ) ORDER BY gb.position) FROM guide_blocks gb WHERE gb.day_id = gd.id
                ), '[]'::jsonb)
            ) ORDER BY gd.day_number) FROM guide_days gd WHERE gd.guide_id = g.id
        ), '[]'::jsonb),
        'createdAt', g.created_at, 'updatedAt', g.updated_at, 'travelerStage', g.traveler_stage,
        'personas', COALESCE((SELECT jsonb_agg(gp.persona ORDER BY gp.persona) FROM guide_personas gp WHERE gp.guide_id = g.id), '[]'::jsonb),
        'bestSeasonStartMonth', g.best_season_start_month, 'bestSeasonEndMonth', g.best_season_end_month,
        'bestSeasonLabel', g.best_season_label, 'latitude', g.latitude, 'longitude', g.longitude
    ), NOW()
FROM guides g WHERE g.id = 'b2000072-0000-4000-8000-000000000000'
ON CONFLICT (guide_id, version_number) DO UPDATE SET snapshot = EXCLUDED.snapshot, published_at = EXCLUDED.published_at;
