-- BOR-72: seed the "Paris by Varlamov" mock guide (curated + translated from the
-- Russian Varlamov Paris PDF). One mock creator owns one published 4-day guide
-- structured Guide -> Day -> Block -> Place, for testing timelines + search.
-- Idempotent (ON CONFLICT). block_category is the CHECK-constrained enum; the
-- literal Activity/Food/Stay/Travel type is in block_type, and every place is
-- tagged activity/food/stay/travel.

INSERT INTO users (id, auth0_subject, email, username, role, status, onboarding_completed)
VALUES ('a2000072-0000-4000-8000-000000000000', 'seed|brooks-paris-varlamov', 'paris.varlamov@brooks.local', 'paris-by-varlamov', 'USER', 'ACTIVE', TRUE)
ON CONFLICT (auth0_subject) DO NOTHING;

INSERT INTO user_profiles (user_id, display_name, bio, avatar_url, region, interests, latitude, longitude, follower_count, following_count, guide_count, is_verified)
VALUES ('a2000072-0000-4000-8000-000000000000', 'Paris by Varlamov', 'A seeded creator: a curated, translated ''best of'' Paris city guide for testing the itinerary timeline, map pins, and search.', 'https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?auto=format&fit=crop&w=320&q=80', 'Paris, France', 'paris, city walks, food, coffee, museums', 48.8566, 2.3522, 240, 15, 1, TRUE)
ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name, bio = EXCLUDED.bio, avatar_url = EXCLUDED.avatar_url, region = EXCLUDED.region, interests = EXCLUDED.interests, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, guide_count = EXCLUDED.guide_count, is_verified = EXCLUDED.is_verified;

INSERT INTO guides (id, creator_id, title, description, cover_image_url, region, primary_city, country, timezone, price_cents, currency, status, version_number, day_count, place_count, traveler_stage, best_season_start_month, best_season_end_month, best_season_label, latitude, longitude, sort_order)
VALUES ('b2000072-0000-4000-8000-000000000000', 'a2000072-0000-4000-8000-000000000000', 'Paris Like Varlamov: A 4-Day Insider Walk Through the Real City', 'A curated 4-day Paris itinerary inspired by Ilya Varlamov''s deep-dive city guide, blending the unmissable landmarks with the specialty coffee bars, handwritten-menu bistros, and offbeat neighborhoods Parisians actually love. Follow it block by block and you''ll see the postcard Paris and the lived-in one on the same day.', 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80', 'Ile-de-France', 'Paris', 'France', 'Europe/Paris', 1900, 'GEL', 'PUBLISHED', 1, 4, 31, 'PLANNING', 4, 10, 'Late spring to early autumn', 48.8566, 2.3522, 1)
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, cover_image_url = EXCLUDED.cover_image_url, region = EXCLUDED.region, primary_city = EXCLUDED.primary_city, country = EXCLUDED.country, timezone = EXCLUDED.timezone, price_cents = EXCLUDED.price_cents, currency = EXCLUDED.currency, status = EXCLUDED.status, version_number = EXCLUDED.version_number, day_count = EXCLUDED.day_count, place_count = EXCLUDED.place_count, traveler_stage = EXCLUDED.traveler_stage, best_season_start_month = EXCLUDED.best_season_start_month, best_season_end_month = EXCLUDED.best_season_end_month, best_season_label = EXCLUDED.best_season_label, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, sort_order = EXCLUDED.sort_order, updated_at = NOW();

INSERT INTO guide_tags (guide_id, tag) VALUES
  ('b2000072-0000-4000-8000-000000000000', 'paris'),
  ('b2000072-0000-4000-8000-000000000000', 'france'),
  ('b2000072-0000-4000-8000-000000000000', 'city-walk'),
  ('b2000072-0000-4000-8000-000000000000', 'food'),
  ('b2000072-0000-4000-8000-000000000000', 'coffee'),
  ('b2000072-0000-4000-8000-000000000000', 'museums'),
  ('b2000072-0000-4000-8000-000000000000', 'hidden-gems')
ON CONFLICT (guide_id, tag) DO NOTHING;

INSERT INTO guide_personas (guide_id, persona) VALUES
  ('b2000072-0000-4000-8000-000000000000', 'SOLO'),
  ('b2000072-0000-4000-8000-000000000000', 'FAMILY')
ON CONFLICT (guide_id, persona) DO NOTHING;

INSERT INTO guide_days (id, guide_id, day_number, title, description, image_url) VALUES
  ('c2000072-0000-4000-8000-000000000001', 'b2000072-0000-4000-8000-000000000000', 1, 'The Heart of Paris: Islands, Cathedrals & the Right Bank', 'Start where the city began, on the two Seine islands, then loop through the 1st and the Marais. Today is about the classic core, done on foot.', 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80'),
  ('c2000072-0000-4000-8000-000000000002', 'b2000072-0000-4000-8000-000000000000', 2, 'The Left Bank: Latin Quarter, Gardens & the Seine at Dusk', 'An anthropologist''s walk through the 5th and 6th: Roman ruins, a botanical garden, a market street, a mosque tearoom, ending at the river.', 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=1200&q=80'),
  ('c2000072-0000-4000-8000-000000000003', 'b2000072-0000-4000-8000-000000000000', 3, 'Icons, Specialty Coffee & a Rooftop View', 'The Eiffel Tower and a world-cultures museum in the morning, then the city''s best modern coffee and food streets, capped by a rooftop.', 'https://images.unsplash.com/photo-1431274172761-fca41d930114?auto=format&fit=crop&w=1200&q=80'),
  ('c2000072-0000-4000-8000-000000000004', 'b2000072-0000-4000-8000-000000000000', 4, 'Canals, Montmartre & the Other Paris', 'A getting-around day that runs from the Canal Saint-Martin up to Montmartre, with a detour into the multicultural Goutte d''Or, ending with the city''s best oysters.', 'https://images.unsplash.com/photo-1520939817895-060bdaf4fe1b?auto=format&fit=crop&w=1200&q=80')
ON CONFLICT (guide_id, day_number) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, image_url = EXCLUDED.image_url, updated_at = NOW();

INSERT INTO guide_blocks (id, day_id, position, title, description, block_type, block_category, suggested_start_minute, suggested_duration_minutes) VALUES
  ('d2000072-0000-4000-8000-000000000001', 'c2000072-0000-4000-8000-000000000001', 1, 'The Île de la Cité & Notre-Dame', 'Paris''s medieval heart, with the newly reopened cathedral and its Gothic neighbor.', 'ACTIVITY', 'ACTIVITY', 540, 180),
  ('d2000072-0000-4000-8000-000000000002', 'c2000072-0000-4000-8000-000000000001', 2, 'Lunch in the 1st', 'A handwritten-menu bistro and a sandwich legend, depending on your appetite.', 'FOOD', 'ACTIVITY', 750, 90),
  ('d2000072-0000-4000-8000-000000000003', 'c2000072-0000-4000-8000-000000000001', 3, 'The Marais & Place des Vosges', 'Old Paris atmosphere, creative shops and the city''s most graceful square.', 'ACTIVITY', 'ACTIVITY', 870, 150),
  ('d2000072-0000-4000-8000-000000000004', 'c2000072-0000-4000-8000-000000000002', 1, 'Gardens, Romans & a Mosque Tearoom', 'The quieter, leafier side of the Latin Quarter, good for kids and grown-ups alike.', 'ACTIVITY', 'ACTIVITY', 570, 180),
  ('d2000072-0000-4000-8000-000000000005', 'c2000072-0000-4000-8000-000000000002', 2, 'Rue Mouffetard & Lunch', 'One of the oldest market streets in Paris, lively and food-packed.', 'FOOD', 'ACTIVITY', 780, 90),
  ('d2000072-0000-4000-8000-000000000006', 'c2000072-0000-4000-8000-000000000002', 3, 'Saint-Germain to the Seine', 'Storied cafes, the Luxembourg gardens, and the river at golden hour.', 'ACTIVITY', 'ACTIVITY', 900, 180),
  ('d2000072-0000-4000-8000-000000000007', 'c2000072-0000-4000-8000-000000000003', 1, 'Eiffel Tower & Quai Branly', 'The icon up close, plus a Jean Nouvel museum hidden behind a vertical garden.', 'ACTIVITY', 'ACTIVITY', 540, 210),
  ('d2000072-0000-4000-8000-000000000008', 'c2000072-0000-4000-8000-000000000003', 2, 'Rue du Nil: Coffee, Bread & Lunch', 'Paris''s most concentrated food street, a few steps long and full of good things.', 'FOOD', 'ACTIVITY', 780, 120),
  ('d2000072-0000-4000-8000-000000000009', 'c2000072-0000-4000-8000-000000000003', 3, 'Specialty Coffee & a Sunset Rooftop', 'Two of the city''s serious coffee spots, then up to a panoramic terrace.', 'ACTIVITY', 'ACTIVITY', 960, 180),
  ('d2000072-0000-4000-8000-000000000010', 'c2000072-0000-4000-8000-000000000004', 1, 'Getting Around: Metro & Canal', 'How to move through Paris, with the day starting along the city''s prettiest waterway.', 'TRAVEL', 'TRANSPORT', 540, 120),
  ('d2000072-0000-4000-8000-000000000011', 'c2000072-0000-4000-8000-000000000004', 2, 'Montmartre & the Goutte d''Or', 'The artists'' hill and, just below it, the West-African heart of the city.', 'ACTIVITY', 'ACTIVITY', 720, 210),
  ('d2000072-0000-4000-8000-000000000012', 'c2000072-0000-4000-8000-000000000004', 3, 'Oysters Behind Bastille', 'The cheapest, freshest oysters in Paris, at a neighborhood market fishmonger.', 'FOOD', 'ACTIVITY', 1020, 90)
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, block_type = EXCLUDED.block_type, block_category = EXCLUDED.block_category, suggested_start_minute = EXCLUDED.suggested_start_minute, suggested_duration_minutes = EXCLUDED.suggested_duration_minutes, updated_at = NOW();

INSERT INTO guide_places (id, block_id, position, name, description, address, latitude, longitude, category, price_level, suggested_start_minute, suggested_duration_minutes) VALUES
  ('e2000072-0000-4000-8000-000000000001', 'd2000072-0000-4000-8000-000000000001', 1, 'Notre-Dame de Paris', 'Reopened to visitors in December 2024 after five years of restoration, and the entry is free. Go early or pre-book online: the queue moves fast, and inside the new consecrated altar sits at the center of a space that fuses the work of many eras and generations of craftsmen.', '6 Parvis Notre-Dame - Pl. Jean-Paul II, 75004 Paris', 48.853, 2.3499, 'LANDMARK', 0, 540, 60),
  ('e2000072-0000-4000-8000-000000000002', 'd2000072-0000-4000-8000-000000000001', 2, 'Sainte-Chapelle', 'A jewel-box chapel built by Louis IX to house holy relics, including the Crown of Thorns he brought back from the Crusades. Because it sits inside the old Palais de Justice complex, you pass through a metal detector to enter, then walk up into a room that is essentially walls of stained glass and light.', '10 Bd du Palais, 75001 Paris', 48.8554, 2.345, 'ATTRACTION', 0, 600, 60),
  ('e2000072-0000-4000-8000-000000000003', 'd2000072-0000-4000-8000-000000000001', 3, 'Square du Vert-Galant', 'The little tree-shaded point at the western tip of the island, just below Pont Neuf. Varlamov calls it the best spot to be when the sun starts to set: face Notre-Dame and you get one of the loveliest views in Paris with the river splitting around you.', 'Square du Vert-Galant, 75001 Paris', 48.8567, 2.3403, 'VIEWPOINT', 0, 660, 60),
  ('e2000072-0000-4000-8000-000000000004', 'd2000072-0000-4000-8000-000000000002', 1, 'Chez Alain Miam Miam', 'A tiny stall in the covered Marche des Enfants Rouges with one of the best sandwiches in the city, and almost always a queue. The bread is baked specially for it and warmed on the press; the most popular order is the souped-up ham-and-cheese, layered with caramelized onion, mushrooms and whatever extras you choose.', '26 Rue Charlot, 75003 Paris', 48.8625, 2.3637, 'MARKET', 1, 750, 45),
  ('e2000072-0000-4000-8000-000000000005', 'd2000072-0000-4000-8000-000000000002', 2, 'Le Bon Georges', 'A bistro where the menu is rewritten by hand every day and shifts with the season; the tartare and the meat dishes are the safe bets. The real reason to come is dessert: arguably the biggest, richest chocolate mousse in Paris, brought to the table in a full pot.', '45 Rue Saint-Georges, 75009 Paris', 48.8784, 2.339, 'RESTAURANT', 2, 795, 45),
  ('e2000072-0000-4000-8000-000000000006', 'd2000072-0000-4000-8000-000000000003', 1, 'Place des Vosges', 'The arcaded centerpiece of the Marais and the city''s oldest planned square. Sit on the grass like the locals do; the surrounding 3rd and 4th arrondissements are full of narrow lanes, vintage shops, galleries and cozy bars made for wandering.', 'Place des Vosges, 75004 Paris', 48.8554, 2.3655, 'ATTRACTION', 0, 870, 50),
  ('e2000072-0000-4000-8000-000000000007', 'd2000072-0000-4000-8000-000000000003', 2, 'Musee Carnavalet', 'The free museum of the history of Paris, set in two Marais mansions. It''s an easy, atmospheric stop on a walk through the quarter, and the price (nothing) makes it a no-brainer if you want to understand how the city grew layer by layer.', '23 Rue de Sevigne, 75003 Paris', 48.8575, 2.3627, 'MUSEUM', 1, 920, 50),
  ('e2000072-0000-4000-8000-000000000008', 'd2000072-0000-4000-8000-000000000003', 3, 'Divvino Marais', 'A wine shop at street level with a cellar bar tucked downstairs. Decent wines by the glass and simple plates of cheese and charcuterie; an unpretentious, friendly spot to end the day if you''re in the Marais and want a glass.', '16 Rue Elzevir, 75003 Paris', 48.8585, 2.362, 'BAR', 2, 970, 50),
  ('e2000072-0000-4000-8000-000000000009', 'd2000072-0000-4000-8000-000000000004', 1, 'Jardin des Plantes', 'The grand botanical garden laid out in the 18th century, one of the first scientific-educational gardens in Europe and still gorgeous, especially mid-morning before the crowds. On the grounds you''ll find a small zoo, a kids'' playground and the famous natural-history galleries with the dinosaur skeletons.', '57 Rue Cuvier, 75005 Paris', 48.8443, 2.3597, 'PARK', 0, 570, 60),
  ('e2000072-0000-4000-8000-000000000010', 'd2000072-0000-4000-8000-000000000004', 2, 'Arenes de Lutece', 'A Roman amphitheater dating to the 2nd century, hidden in plain sight off Rue Monge. There''s no ticket and rarely a crowd; local men play petanque on the old arena floor where gladiators once fought. It nearly didn''t survive: Victor Hugo helped lead the campaign to save it from demolition.', '49 Rue Monge, 75005 Paris', 48.8456, 2.353, 'ATTRACTION', 0, 630, 60),
  ('e2000072-0000-4000-8000-000000000011', 'd2000072-0000-4000-8000-000000000004', 3, 'Grande Mosquee de Paris', 'Turn off Rue Monge for sweet Moroccan mint tea in the courtyard of the city''s grand mosque, an original surviving piece of Paris''s North African heritage. It''s an unexpectedly serene pause, mint tea and pastries under tilework, a few minutes from the Roman ruins.', '2bis Pl. du Puits de l''Ermite, 75005 Paris', 48.8419, 2.3552, 'ATTRACTION', 0, 690, 60),
  ('e2000072-0000-4000-8000-000000000012', 'd2000072-0000-4000-8000-000000000005', 1, 'Rue Mouffetard', 'An ancient, sloping market street crammed with cheese shops, wine bars and bistros, far less touristy than the center and cheaper too. Hemingway lived nearby and wrote about it in A Moveable Feast; on weekend evenings people still dance to accordion music in the little square by the fountain at the bottom.', 'Rue Mouffetard, 75005 Paris', 48.8419, 2.3497, 'MARKET', 1, 780, 45),
  ('e2000072-0000-4000-8000-000000000013', 'd2000072-0000-4000-8000-000000000005', 2, 'Cafe Nuances', 'A striking specialty coffee bar with a bold, unusual interior worth seeing in itself. The coffee is good (not legendary), but the espresso-based drinks are reliable and a slice of cake or a cookie alongside is the move.', '25 Rue Danielle Casanova, 75001 Paris', 48.8675, 2.3322, 'CAFE', 1, 825, 45),
  ('e2000072-0000-4000-8000-000000000014', 'd2000072-0000-4000-8000-000000000006', 1, 'Jardin du Luxembourg', 'The most beautiful garden on the Left Bank, in the elegant (and expensive) 6th. Drop in when the weather''s good: kids sail rented toy boats on the central fountain, locals doze in the iconic green chairs, and the surrounding streets are pure storybook Paris of boulevards and old architecture.', '75006 Paris', 48.8462, 2.3372, 'PARK', 0, 900, 60),
  ('e2000072-0000-4000-8000-000000000015', 'd2000072-0000-4000-8000-000000000006', 2, 'Les Deux Magots', 'The legendary Saint-Germain cafe where Hemingway and Sartre wrote, with prices that are steep. You''re paying for the address and the history, but for one coffee at a marble table in the literary heart of the Left Bank, it''s part of the Paris ritual.', '6 Pl. Saint-Germain des Pres, 75006 Paris', 48.854, 2.3333, 'CAFE', 1, 960, 60),
  ('e2000072-0000-4000-8000-000000000016', 'd2000072-0000-4000-8000-000000000006', 3, 'Pont des Arts', 'The pedestrian bridge with a postcard view straight to the Ile de la Cite. Time it for late afternoon and walk west toward Notre-Dame as the sun drops, then carry on down to the riverbank, the stretch around here is one of the loveliest free things you can do in Paris.', 'Pont des Arts, 75006 Paris', 48.8585, 2.3375, 'VIEWPOINT', 0, 1020, 60),
  ('e2000072-0000-4000-8000-000000000017', 'd2000072-0000-4000-8000-000000000007', 1, 'Eiffel Tower', 'Go early to beat the lines. Climbing the stairs to the second floor is the cheapest and most satisfying way up; the lift to the summit costs more. Under-fours go free. Even if you don''t go up, the 7th arrondissement around it, where the tower lives, is worth the walk.', 'Av. Gustave Eiffel, 75007 Paris', 48.8584, 2.2945, 'LANDMARK', 0, 540, 105),
  ('e2000072-0000-4000-8000-000000000018', 'd2000072-0000-4000-8000-000000000007', 2, 'Musee du quai Branly - Jacques Chirac', 'A short walk from the Eiffel Tower, this Jean Nouvel building is wrapped in a living vertical garden and devoted to the art and cultures of Africa, Asia, the Americas and Oceania. Even the approach is beautiful; inside is one of Europe''s most underrated collections, and the grounds are a fine spot to sprawl on a lounger in good weather.', '37 Quai Branly, 75007 Paris', 48.8611, 2.2975, 'MUSEUM', 1, 645, 105),
  ('e2000072-0000-4000-8000-000000000019', 'd2000072-0000-4000-8000-000000000008', 1, 'Terroirs d''Avenir Boulangerie', 'On the small but mighty Rue du Nil, this bakery turns out some of the best croissants in Paris, made to a 19th-century recipe. Don''t miss the kouign-amann, the buttery, caramelized Breton pastry whose name translates literally as butter cake.', '3 Rue du Nil, 75002 Paris', 48.8676, 2.3478, 'BAKERY', 1, 780, 40),
  ('e2000072-0000-4000-8000-000000000020', 'd2000072-0000-4000-8000-000000000008', 2, 'L''Arbre a Cafe', 'A first-rate coffee bar that locals genuinely rate, roasting their own organically grown, fair-sourced beans. There are several branches in Paris, but the Rue du Nil point is the best of them, perfectly placed for a flat white between bakery and lunch.', '10 Rue du Nil, 75002 Paris', 48.8675, 2.3479, 'CAFE', 1, 820, 40),
  ('e2000072-0000-4000-8000-000000000021', 'd2000072-0000-4000-8000-000000000008', 3, 'Frenchie Bar a Vins', 'The wine-bar offshoot of star chef Gregory Marchand''s Frenchie empire on the same little street. No reservations, sit at the bar, and the small plates and mains are genuinely thrilling, this is where the food on Rue du Nil peaks.', '6 Rue du Nil, 75002 Paris', 48.8676, 2.3477, 'BAR', 2, 860, 40),
  ('e2000072-0000-4000-8000-000000000022', 'd2000072-0000-4000-8000-000000000009', 1, 'Substance Cafe', 'Quite possibly the best coffee menu in Paris, with a range of rare beans you won''t find elsewhere; people come precisely for the obsession. Started by a barista-turned-collector who''ll talk you through every bean; weekdays only and you scan a QR code to book a slot.', '30 Rue Dussoubs, 75002 Paris', 48.8649, 2.349, 'CAFE', 1, 960, 60),
  ('e2000072-0000-4000-8000-000000000023', 'd2000072-0000-4000-8000-000000000009', 2, 'TIBA Coffee', 'A small bar strictly for people who come for the coffee itself, no croissants, no pastries, just four to six rare single-origin filters with an always-interesting choice. Varlamov ranks it among the best in Paris: a place for connoisseurs.', '51 Rue Charlot, 75003 Paris', 48.8639, 2.3645, 'CAFE', 1, 1020, 60),
  ('e2000072-0000-4000-8000-000000000024', 'd2000072-0000-4000-8000-000000000009', 3, 'Roof (Madame Reve)', 'A rooftop right in the center, atop the Madame Reve hotel, with a glass roof and a panorama over the whole city, especially magic in the evening when the Eiffel Tower, Notre-Dame and the rest light up. You''re really paying for the view and the cocktails, so book a table ahead.', '48 Rue du Louvre, 75001 Paris', 48.8655, 2.3447, 'VIEWPOINT', 0, 1080, 60),
  ('e2000072-0000-4000-8000-000000000025', 'd2000072-0000-4000-8000-000000000010', 1, 'Gare du Nord (Metro & RER hub)', 'Use this as your transport anchor: buy a contactless Navigo Easy or load tickets in the Ile-de-France Mobilites app rather than queuing at machines, which often have long lines. The Paris metro is dense and fast, the simplest way to cover ground, and RER lines from here reach both airports (about 30 minutes to Charles de Gaulle).', '18 Rue de Dunkerque, 75010 Paris', 48.8809, 2.3553, 'TRANSPORT', 0, 540, 60),
  ('e2000072-0000-4000-8000-000000000026', 'd2000072-0000-4000-8000-000000000010', 2, 'Canal Saint-Martin', 'A genuine piece of 19th-century engineering, with locks and swing bridges that still raise and lower boats; in one stretch the canal disappears underground entirely. Walk the banks where Parisians sit right at the water''s edge with coffee or wine, a relaxed, local scene a world away from the monuments.', 'Quai de Valmy, 75010 Paris', 48.8717, 2.366, 'ATTRACTION', 0, 600, 60),
  ('e2000072-0000-4000-8000-000000000027', 'd2000072-0000-4000-8000-000000000011', 1, 'Basilique du Sacre-Coeur', 'The white basilica crowns the city''s highest hill, with sweeping views and the tangle of old village streets behind it. It''s touristy, so go early; the genuinely charming corners are the quieter lanes away from the main square.', '35 Rue du Chevalier de la Barre, 75018 Paris', 48.8867, 2.3431, 'LANDMARK', 0, 720, 70),
  ('e2000072-0000-4000-8000-000000000028', 'd2000072-0000-4000-8000-000000000011', 2, 'Clove Coffee', 'A serious little coffee bar with high-end gear just below Sacre-Coeur. You can''t sit with a laptop here, it''s for drinking coffee, but if you''re walking around the basilica it''s exactly the right place to duck into for a properly made cup.', '14 Rue Chappe, 75018 Paris', 48.8856, 2.3414, 'CAFE', 1, 790, 70),
  ('e2000072-0000-4000-8000-000000000029', 'd2000072-0000-4000-8000-000000000011', 3, 'Goutte d''Or', 'Just downhill, this is Paris seen from a different angle, the West-African and North-African heart of the city around Boulevard Barbes and the Marche Dejean. It''s loud, vivid and full of spices, fabrics and foods, a totally different texture of the city; go curious and respectful.', 'Rue Dejean, 75018 Paris', 48.887, 2.349, 'MARKET', 1, 860, 70),
  ('e2000072-0000-4000-8000-000000000030', 'd2000072-0000-4000-8000-000000000012', 1, 'Marche d''Aligre fishmonger', 'Varlamov fell hard for oysters in Paris, and the trick is to skip the tourist spots where they''re expensive and dull. Behind Bastille on Rue d''Aligre, this little fishmonger does six oysters and a glass of white for around twelve euros, fresh, cheap and exactly right; pick whichever variety you like best.', '17 Rue d''Aligre, 75012 Paris', 48.8497, 2.3781, 'MARKET', 1, 1020, 45),
  ('e2000072-0000-4000-8000-000000000031', 'd2000072-0000-4000-8000-000000000012', 2, 'La Fontaine de Mars', 'If you''d rather a sit-down French classic, this 1908 restaurant near the Eiffel Tower has a lovely, snug interior and a perfect terrace for warm weather. The escargots are excellent and the foie gras delightful, the kind of old-school bistro meal you came to Paris for.', '129 Rue Saint-Dominique, 75007 Paris', 48.8585, 2.301, 'RESTAURANT', 2, 1065, 45)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, address = EXCLUDED.address, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, category = EXCLUDED.category, price_level = EXCLUDED.price_level, suggested_start_minute = EXCLUDED.suggested_start_minute, suggested_duration_minutes = EXCLUDED.suggested_duration_minutes, updated_at = NOW();

DELETE FROM guide_place_tags WHERE place_id IN ('e2000072-0000-4000-8000-000000000001', 'e2000072-0000-4000-8000-000000000002', 'e2000072-0000-4000-8000-000000000003', 'e2000072-0000-4000-8000-000000000004', 'e2000072-0000-4000-8000-000000000005', 'e2000072-0000-4000-8000-000000000006', 'e2000072-0000-4000-8000-000000000007', 'e2000072-0000-4000-8000-000000000008', 'e2000072-0000-4000-8000-000000000009', 'e2000072-0000-4000-8000-000000000010', 'e2000072-0000-4000-8000-000000000011', 'e2000072-0000-4000-8000-000000000012', 'e2000072-0000-4000-8000-000000000013', 'e2000072-0000-4000-8000-000000000014', 'e2000072-0000-4000-8000-000000000015', 'e2000072-0000-4000-8000-000000000016', 'e2000072-0000-4000-8000-000000000017', 'e2000072-0000-4000-8000-000000000018', 'e2000072-0000-4000-8000-000000000019', 'e2000072-0000-4000-8000-000000000020', 'e2000072-0000-4000-8000-000000000021', 'e2000072-0000-4000-8000-000000000022', 'e2000072-0000-4000-8000-000000000023', 'e2000072-0000-4000-8000-000000000024', 'e2000072-0000-4000-8000-000000000025', 'e2000072-0000-4000-8000-000000000026', 'e2000072-0000-4000-8000-000000000027', 'e2000072-0000-4000-8000-000000000028', 'e2000072-0000-4000-8000-000000000029', 'e2000072-0000-4000-8000-000000000030', 'e2000072-0000-4000-8000-000000000031');
INSERT INTO guide_place_tags (place_id, tag) VALUES
  ('e2000072-0000-4000-8000-000000000001', 'activity'),
  ('e2000072-0000-4000-8000-000000000002', 'activity'),
  ('e2000072-0000-4000-8000-000000000003', 'activity'),
  ('e2000072-0000-4000-8000-000000000004', 'food'),
  ('e2000072-0000-4000-8000-000000000005', 'food'),
  ('e2000072-0000-4000-8000-000000000006', 'activity'),
  ('e2000072-0000-4000-8000-000000000007', 'activity'),
  ('e2000072-0000-4000-8000-000000000008', 'food'),
  ('e2000072-0000-4000-8000-000000000009', 'activity'),
  ('e2000072-0000-4000-8000-000000000010', 'activity'),
  ('e2000072-0000-4000-8000-000000000011', 'activity'),
  ('e2000072-0000-4000-8000-000000000012', 'food'),
  ('e2000072-0000-4000-8000-000000000013', 'food'),
  ('e2000072-0000-4000-8000-000000000014', 'activity'),
  ('e2000072-0000-4000-8000-000000000015', 'food'),
  ('e2000072-0000-4000-8000-000000000016', 'activity'),
  ('e2000072-0000-4000-8000-000000000017', 'activity'),
  ('e2000072-0000-4000-8000-000000000018', 'activity'),
  ('e2000072-0000-4000-8000-000000000019', 'food'),
  ('e2000072-0000-4000-8000-000000000020', 'food'),
  ('e2000072-0000-4000-8000-000000000021', 'food'),
  ('e2000072-0000-4000-8000-000000000022', 'food'),
  ('e2000072-0000-4000-8000-000000000023', 'food'),
  ('e2000072-0000-4000-8000-000000000024', 'activity'),
  ('e2000072-0000-4000-8000-000000000025', 'travel'),
  ('e2000072-0000-4000-8000-000000000026', 'activity'),
  ('e2000072-0000-4000-8000-000000000027', 'activity'),
  ('e2000072-0000-4000-8000-000000000028', 'food'),
  ('e2000072-0000-4000-8000-000000000029', 'activity'),
  ('e2000072-0000-4000-8000-000000000030', 'food'),
  ('e2000072-0000-4000-8000-000000000031', 'food');

INSERT INTO guide_place_images (id, place_id, image_url, caption, position) VALUES
  ('f2000072-0000-4000-8000-000000000001', 'e2000072-0000-4000-8000-000000000001', 'https://images.unsplash.com/photo-1478391679764-b2d8b3cd1e94?auto=format&fit=crop&w=900&q=80', 'Notre-Dame de Paris', 0),
  ('f2000072-0000-4000-8000-000000000002', 'e2000072-0000-4000-8000-000000000006', 'https://images.unsplash.com/photo-1549144511-f099e773c147?auto=format&fit=crop&w=900&q=80', 'Place des Vosges', 0),
  ('f2000072-0000-4000-8000-000000000003', 'e2000072-0000-4000-8000-000000000014', 'https://images.unsplash.com/photo-1558019206-1f5d77d4b9c5?auto=format&fit=crop&w=900&q=80', 'Jardin du Luxembourg', 0),
  ('f2000072-0000-4000-8000-000000000004', 'e2000072-0000-4000-8000-000000000017', 'https://images.unsplash.com/photo-1543349689-9a4d426bee8e?auto=format&fit=crop&w=900&q=80', 'Eiffel Tower', 0),
  ('f2000072-0000-4000-8000-000000000005', 'e2000072-0000-4000-8000-000000000026', 'https://images.unsplash.com/photo-1556767576-5ec41e3239ea?auto=format&fit=crop&w=900&q=80', 'Canal Saint-Martin', 0),
  ('f2000072-0000-4000-8000-000000000006', 'e2000072-0000-4000-8000-000000000027', 'https://images.unsplash.com/photo-1550340499-a6c60fc8287c?auto=format&fit=crop&w=900&q=80', 'Basilique du Sacre-Coeur', 0)
ON CONFLICT (id) DO NOTHING;

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
