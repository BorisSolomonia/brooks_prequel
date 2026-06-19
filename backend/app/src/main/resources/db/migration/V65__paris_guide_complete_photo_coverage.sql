-- BOR-73: Complete photo coverage for the seeded Paris guide.
-- Audit (V63): of the 31 places, only 6 had a guide_place_images row, and 2 of
-- those 6 pointed at Unsplash photo IDs that now 404 (Eiffel Tower, Jardin du
-- Luxembourg). This migration:
--   1. Repairs the 2 dead image URLs on the existing rows.
--   2. Inserts one validated, topical, royalty-free image for each of the 25
--      remaining places so 100% of places have at least one valid image.
--   3. Rebuilds the version snapshot so guide detail / preview / timeline UI
--      reflect the new images.
-- All URLs were verified to return HTTP 200 before being committed.
-- Forward migration (V63/V64 already applied; never edit an applied migration).
-- New image-row IDs use the f2000072-...-0000000001NN range (NN = place number)
-- to avoid collision with the existing f...001-006 rows.

-- 1. Repair the two existing images whose Unsplash IDs went dead.
UPDATE guide_place_images
SET image_url = 'https://images.unsplash.com/photo-1564594985645-4427056e22e2?auto=format&fit=crop&w=900&q=80'
WHERE id = 'f2000072-0000-4000-8000-000000000003';  -- Jardin du Luxembourg (place 014)

UPDATE guide_place_images
SET image_url = 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?auto=format&fit=crop&w=900&q=80'
WHERE id = 'f2000072-0000-4000-8000-000000000004';  -- Eiffel Tower (place 017)

-- 2. Add one image to each of the 25 places that had none.
INSERT INTO guide_place_images (id, place_id, image_url, caption, position) VALUES
  ('f2000072-0000-4000-8000-000000000102', 'e2000072-0000-4000-8000-000000000002', 'https://images.unsplash.com/photo-1541855492-581f618f69a0?auto=format&fit=crop&w=900&q=80', 'Sainte-Chapelle', 0),
  ('f2000072-0000-4000-8000-000000000103', 'e2000072-0000-4000-8000-000000000003', 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=900&q=80', 'Square du Vert-Galant', 0),
  ('f2000072-0000-4000-8000-000000000104', 'e2000072-0000-4000-8000-000000000004', 'https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?auto=format&fit=crop&w=900&q=80', 'Chez Alain Miam Miam', 0),
  ('f2000072-0000-4000-8000-000000000105', 'e2000072-0000-4000-8000-000000000005', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80', 'Le Bon Georges', 0),
  ('f2000072-0000-4000-8000-000000000107', 'e2000072-0000-4000-8000-000000000007', 'https://images.unsplash.com/photo-1545987796-200677ee1011?auto=format&fit=crop&w=900&q=80', 'Musee Carnavalet', 0),
  ('f2000072-0000-4000-8000-000000000108', 'e2000072-0000-4000-8000-000000000008', 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=900&q=80', 'Divvino Marais', 0),
  ('f2000072-0000-4000-8000-000000000109', 'e2000072-0000-4000-8000-000000000009', 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?auto=format&fit=crop&w=900&q=80', 'Jardin des Plantes', 0),
  ('f2000072-0000-4000-8000-000000000110', 'e2000072-0000-4000-8000-000000000010', 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=900&q=80', 'Arenes de Lutece', 0),
  ('f2000072-0000-4000-8000-000000000111', 'e2000072-0000-4000-8000-000000000011', 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=900&q=80', 'Grande Mosquee de Paris', 0),
  ('f2000072-0000-4000-8000-000000000112', 'e2000072-0000-4000-8000-000000000012', 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=900&q=80', 'Rue Mouffetard', 0),
  ('f2000072-0000-4000-8000-000000000113', 'e2000072-0000-4000-8000-000000000013', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80', 'Cafe Nuances', 0),
  ('f2000072-0000-4000-8000-000000000115', 'e2000072-0000-4000-8000-000000000015', 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=900&q=80', 'Les Deux Magots', 0),
  ('f2000072-0000-4000-8000-000000000116', 'e2000072-0000-4000-8000-000000000016', 'https://images.unsplash.com/photo-1463797221720-6b07e6426c24?auto=format&fit=crop&w=900&q=80', 'Pont des Arts', 0),
  ('f2000072-0000-4000-8000-000000000118', 'e2000072-0000-4000-8000-000000000018', 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=900&q=80', 'Musee du quai Branly', 0),
  ('f2000072-0000-4000-8000-000000000119', 'e2000072-0000-4000-8000-000000000019', 'https://images.unsplash.com/photo-1568254183919-78a4f43a2877?auto=format&fit=crop&w=900&q=80', 'Terroirs d''Avenir Boulangerie', 0),
  ('f2000072-0000-4000-8000-000000000120', 'e2000072-0000-4000-8000-000000000020', 'https://images.unsplash.com/photo-1559496417-e7f25cb247f3?auto=format&fit=crop&w=900&q=80', 'L''Arbre a Cafe', 0),
  ('f2000072-0000-4000-8000-000000000121', 'e2000072-0000-4000-8000-000000000021', 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=900&q=80', 'Frenchie Bar a Vins', 0),
  ('f2000072-0000-4000-8000-000000000122', 'e2000072-0000-4000-8000-000000000022', 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=900&q=80', 'Substance Cafe', 0),
  ('f2000072-0000-4000-8000-000000000123', 'e2000072-0000-4000-8000-000000000023', 'https://images.unsplash.com/photo-1453614512568-c4024d13c247?auto=format&fit=crop&w=900&q=80', 'TIBA Coffee', 0),
  ('f2000072-0000-4000-8000-000000000124', 'e2000072-0000-4000-8000-000000000024', 'https://images.unsplash.com/photo-1522093007474-d86e9bf7ba6f?auto=format&fit=crop&w=900&q=80', 'Roof (Madame Reve)', 0),
  ('f2000072-0000-4000-8000-000000000125', 'e2000072-0000-4000-8000-000000000025', 'https://images.unsplash.com/photo-1532105956626-9569c03602f6?auto=format&fit=crop&w=900&q=80', 'Gare du Nord', 0),
  ('f2000072-0000-4000-8000-000000000128', 'e2000072-0000-4000-8000-000000000028', 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=900&q=80', 'Clove Coffee', 0),
  ('f2000072-0000-4000-8000-000000000129', 'e2000072-0000-4000-8000-000000000029', 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80', 'Goutte d''Or', 0),
  ('f2000072-0000-4000-8000-000000000130', 'e2000072-0000-4000-8000-000000000030', 'https://images.unsplash.com/photo-1559737558-2f5a35f4523b?auto=format&fit=crop&w=900&q=80', 'Marche d''Aligre', 0),
  ('f2000072-0000-4000-8000-000000000131', 'e2000072-0000-4000-8000-000000000031', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=80', 'La Fontaine de Mars', 0)
ON CONFLICT (id) DO UPDATE SET image_url = EXCLUDED.image_url, caption = EXCLUDED.caption, position = EXCLUDED.position;

-- 3. Rebuild the version snapshot from the now-updated rows (same shape as V63).
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
