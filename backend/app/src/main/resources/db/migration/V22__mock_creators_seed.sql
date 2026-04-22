-- V22: Mock creator seed data for scale testing.
-- 10 creators · 18 guides · 31 days · 62 blocks · 124 places
--
-- UUID scheme (deterministic, human-readable):
--   Users   a000000{n}-0000-4000-8000-000000000000   n=1..10
--   Guides  b000000{nn}-0000-4000-8000-000000000000  nn=01..18
--   Days    c000000{nnn}-0000-4000-8000-000000000000 nnn=001..031
--   Blocks  d000000{nnn}-0000-4000-8000-000000000000 nnn=001..062
--   Places  e000000{nnn}-0000-4000-8000-000000000000 nnn=001..124

-- ════════════════════════════════════════════════════════════
-- USERS
-- ════════════════════════════════════════════════════════════
INSERT INTO users (id, auth0_subject, email, username, role, status, onboarding_completed) VALUES
  ('a0000001-0000-4000-8000-000000000000','seed|brooks-mock-01','marco.vitale@brooks.local',  'marco-vitale',  'USER','ACTIVE',TRUE),
  ('a0000002-0000-4000-8000-000000000000','seed|brooks-mock-02','yuki.tanaka@brooks.local',   'yuki-tanaka',   'USER','ACTIVE',TRUE),
  ('a0000003-0000-4000-8000-000000000000','seed|brooks-mock-03','sofia.mendes@brooks.local',  'sofia-mendes',  'USER','ACTIVE',TRUE),
  ('a0000004-0000-4000-8000-000000000000','seed|brooks-mock-04','james.okafor@brooks.local',  'james-okafor',  'USER','ACTIVE',TRUE),
  ('a0000005-0000-4000-8000-000000000000','seed|brooks-mock-05','leila.ahmadi@brooks.local',  'leila-ahmadi',  'USER','ACTIVE',TRUE),
  ('a0000006-0000-4000-8000-000000000000','seed|brooks-mock-06','carlos.rivera@brooks.local', 'carlos-rivera', 'USER','ACTIVE',TRUE),
  ('a0000007-0000-4000-8000-000000000000','seed|brooks-mock-07','ana.kowalski@brooks.local',  'ana-kowalski',  'USER','ACTIVE',TRUE),
  ('a0000008-0000-4000-8000-000000000000','seed|brooks-mock-08','raj.patel@brooks.local',     'raj-patel',     'USER','ACTIVE',TRUE),
  ('a0000009-0000-4000-8000-000000000000','seed|brooks-mock-09','emma.larsson@brooks.local',  'emma-larsson',  'USER','ACTIVE',TRUE),
  ('a0000010-0000-4000-8000-000000000000','seed|brooks-mock-10','david.chen@brooks.local',    'david-chen',    'USER','ACTIVE',TRUE)
ON CONFLICT (auth0_subject) DO NOTHING;

-- ════════════════════════════════════════════════════════════
-- USER PROFILES
-- ════════════════════════════════════════════════════════════
INSERT INTO user_profiles (user_id, display_name, bio, avatar_url, region, interests, latitude, longitude, follower_count, following_count, guide_count, is_verified) VALUES
  ('a0000001-0000-4000-8000-000000000000',
   'Marco Vitale',
   'Slow travel through Italy for people who eat, drink, and wander with intention.',
   'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=320&q=80',
   'Tuscany, Italy','wine, art, food, solo travel',43.7696,11.2558,8400,312,2,TRUE),

  ('a0000002-0000-4000-8000-000000000000',
   'Yuki Tanaka',
   'Born in Kyoto, based everywhere. I write about Japan the way locals actually experience it.',
   'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=320&q=80',
   'Kansai, Japan','culture, food, photography, trains',35.0116,135.7681,24100,891,3,TRUE),

  ('a0000003-0000-4000-8000-000000000000',
   'Sofia Mendes',
   'Budget traveler and pastry hunter. I find the best €5 meals in cities that want to charge you €50.',
   'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=320&q=80',
   'Lisbon, Portugal','budget travel, food, architecture',38.7169,-9.1395,5600,210,1,FALSE),

  ('a0000004-0000-4000-8000-000000000000',
   'James Okafor',
   'Luxury travel, zero compromises. My guides are for people who want the best version of every city.',
   'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=320&q=80',
   'Lagos, Nigeria','luxury, safari, boutique hotels',-33.9249,18.4241,15200,540,2,TRUE),

  ('a0000005-0000-4000-8000-000000000000',
   'Leila Ahmadi',
   'Digital nomad. I have worked from 34 countries. This is what I actually learned about each one.',
   'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?auto=format&fit=crop&w=320&q=80',
   'Bali, Indonesia','remote work, cafes, co-working',-8.4095,115.1889,18700,730,2,TRUE),

  ('a0000006-0000-4000-8000-000000000000',
   'Carlos Rivera',
   'Family travel strategist. Three kids, one mission: prove family trips can be brilliant, not just safe.',
   'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=320&q=80',
   'Mexico City, Mexico','family, food, history',19.4326,-99.1332,7300,280,1,FALSE),

  ('a0000007-0000-4000-8000-000000000000',
   'Ana Kowalski',
   'Eastern Europe deserves better travel writing. I live in Warsaw and eat my way through every city I visit.',
   'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=320&q=80',
   'Warsaw, Poland','food, vodka, history, architecture',52.2297,21.0122,9800,405,2,TRUE),

  ('a0000008-0000-4000-8000-000000000000',
   'Raj Patel',
   'Trek planner and chaos navigator. Nepal, Sri Lanka, and anywhere else you need courage to go.',
   'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=320&q=80',
   'Kathmandu, Nepal','trekking, adventure, budget',27.7172,85.3240,11200,390,1,FALSE),

  ('a0000009-0000-4000-8000-000000000000',
   'Emma Larsson',
   'Stockholm born. Design obsessed. I write about Scandinavia for people who care how a city actually feels.',
   'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=320&q=80',
   'Stockholm, Sweden','design, food, hygge, lifestyle',59.3293,18.0686,13500,460,2,TRUE),

  ('a0000010-0000-4000-8000-000000000000',
   'David Chen',
   'Architect turned travel writer. I read cities the way other people read books.',
   'https://images.unsplash.com/photo-1463453091185-61582044d556?auto=format&fit=crop&w=320&q=80',
   'New York, USA','architecture, design, urbanism',40.7128,-74.0060,31400,1120,2,TRUE)
ON CONFLICT (user_id) DO NOTHING;

-- ════════════════════════════════════════════════════════════
-- GUIDES  (g01–g18)
-- 2-day guides → day_count=2, place_count=8
-- 1-day guides → day_count=1, place_count=4  (g05,g10,g13,g16,g18)
-- ════════════════════════════════════════════════════════════
INSERT INTO guides (id, creator_id, title, description, cover_image_url, region, primary_city, country,
                   price_cents, currency, status, version_number, day_count, place_count,
                   traveler_stage, best_season_start_month, best_season_end_month, best_season_label, sort_order) VALUES

-- ── Marco Vitale (u1) ──────────────────────────────────────
('b0000001-0000-4000-8000-000000000000','a0000001-0000-4000-8000-000000000000',
 '3 Days in Florence: Art, Wine, and the Streets Most Tourists Never Find',
 'Florence is not a museum. It is a living city where the best experiences happen off the obvious path. This guide shows you what Florentines actually do — from the wine bars that open at 11am to the trattorias where no one speaks English on purpose.',
 'https://images.unsplash.com/photo-1543832923-44667a44c804?auto=format&fit=crop&w=1200&q=80',
 'Tuscany','Florence','Italy',1900,'USD','PUBLISHED',1,2,8,'EXPERIENCING',4,6,'Spring and early summer',1),

('b0000002-0000-4000-8000-000000000000','a0000001-0000-4000-8000-000000000000',
 'Rome After Dark: A Solo Traveler''s Honest Guide to La Dolce Vita',
 'Rome rewards the person who slows down and ignores the tourist script. This is the guide I wish I had on my first solo trip — the restaurants, neighborhoods, and moments that turn a Rome visit into a Rome experience.',
 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1200&q=80',
 'Lazio','Rome','Italy',1400,'USD','PUBLISHED',1,2,8,'DREAMING',3,5,'March to May',2),

-- ── Yuki Tanaka (u2) ───────────────────────────────────────
('b0000003-0000-4000-8000-000000000000','a0000002-0000-4000-8000-000000000000',
 '7 Days in Tokyo: The Neighborhood Guide No Algorithm Will Ever Write',
 'Tokyo has layers. Most visitors see the surface. This guide was written by someone who lived in three different Tokyo neighborhoods over five years and still finds new things every visit. It will not take you to Shibuya Crossing.',
 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80',
 'Kanto','Tokyo','Japan',2900,'USD','PUBLISHED',1,2,8,'PLANNING',NULL,NULL,NULL,1),

('b0000004-0000-4000-8000-000000000000','a0000002-0000-4000-8000-000000000000',
 'Kyoto in Cherry Blossom Season: A Local''s Real Itinerary for the World''s Most Over-Photographed Event',
 'Everyone goes to Kyoto for cherry blossoms. Almost no one knows how to see them without spending three hours in a crowd. This guide is built on 12 years of local knowledge and one strong opinion: the best spots are never the famous ones.',
 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80',
 'Kansai','Kyoto','Japan',1900,'USD','PUBLISHED',1,2,8,'DREAMING',3,4,'Cherry blossom season',2),

('b0000005-0000-4000-8000-000000000000','a0000002-0000-4000-8000-000000000000',
 'Osaka in 24 Hours: Why Osaka Locals Secretly Pity Tokyo Tourists',
 'Osaka is Japan with its guard down — louder, funnier, and significantly better fed. This one-day guide is for people who have done Tokyo and want to understand why half of Japan thinks Osaka is actually the point.',
 'https://images.unsplash.com/photo-1589493060354-3b21ce26e7c9?auto=format&fit=crop&w=1200&q=80',
 'Kansai','Osaka','Japan',1400,'USD','DRAFT',0,1,4,'EXPERIENCING',NULL,NULL,NULL,3),

-- ── Sofia Mendes (u3) ──────────────────────────────────────
('b0000006-0000-4000-8000-000000000000','a0000003-0000-4000-8000-000000000000',
 'Lisbon on 30€ a Day: The Budget Guide That Refuses to Be Generic',
 'Lisbon is one of the last affordable capital cities in Western Europe, but only if you know where to go. Most budget guides just find the cheapest hostel. This one finds the best value in every category — food, transport, neighborhoods, views.',
 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=1200&q=80',
 'Lisbon Region','Lisbon','Portugal',900,'USD','PUBLISHED',1,2,8,'PLANNING',4,10,'Spring through autumn',1),

-- ── James Okafor (u4) ──────────────────────────────────────
('b0000007-0000-4000-8000-000000000000','a0000004-0000-4000-8000-000000000000',
 'Cape Town in 5 Days: The Luxury City Break That Quietly Rewires Your Perspective',
 'Cape Town is one of the most complex, beautiful, and contradictory cities on earth. This guide is for travelers who want more than wine estates and cable cars — people who want to understand what they are looking at and leave changed.',
 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?auto=format&fit=crop&w=1200&q=80',
 'Western Cape','Cape Town','South Africa',3900,'USD','PUBLISHED',1,2,8,'DREAMING',11,3,'Southern summer (Nov–Mar)',1),

('b0000008-0000-4000-8000-000000000000','a0000004-0000-4000-8000-000000000000',
 'Marrakech in 48 Hours: A Medina Escape for the Traveler Who Has Already Done Paris',
 'Marrakech is not what most people expect — not when you stop following the tourist script. This guide is for someone who wants the real Medina: the souk logic, the rooftop at 6am, and the riad that charges for the experience, not the Instagram.',
 'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?auto=format&fit=crop&w=1200&q=80',
 'Marrakech-Safi','Marrakech','Morocco',2900,'USD','PUBLISHED',1,2,8,'DREAMING',3,5,'Spring (March–May)',2),

-- ── Leila Ahmadi (u5) ──────────────────────────────────────
('b0000009-0000-4000-8000-000000000000','a0000005-0000-4000-8000-000000000000',
 'Bali for Remote Workers: The Cafes, Co-Working Spaces, and Honest Logistics You Actually Need',
 'Bali has been sold as a digital nomad paradise. Some of it is true. A lot of it is overhyped. This guide is written after 14 months of remote work across Canggu, Ubud, and Seminyak — the wifi speeds, the coffee quality, and the things you wish someone had told you.',
 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80',
 'Bali','Canggu','Indonesia',1900,'USD','PUBLISHED',1,2,8,'PLANNING',5,10,'Dry season (May–Oct)',1),

('b0000010-0000-4000-8000-000000000000','a0000005-0000-4000-8000-000000000000',
 'Chiang Mai Digital Nomad Guide: The City That Keeps Pulling You Back for Reasons You Cannot Explain',
 'Chiang Mai has the best cost-to-quality ratio of any city I have ever worked from. This guide covers what no other nomad guide does: the neighborhoods that feel like home after a week, the cafes worth the commute, and the things that go wrong.',
 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80',
 'Northern Thailand','Chiang Mai','Thailand',1400,'USD','DRAFT',0,1,4,'PLANNING',11,4,'Cool season (Nov–Apr)',2),

-- ── Carlos Rivera (u6) ─────────────────────────────────────
('b0000011-0000-4000-8000-000000000000','a0000006-0000-4000-8000-000000000000',
 'Mexico City with Kids: A Family-Tested 4-Day Route Through the Greatest City in the Americas',
 'Mexico City terrifies a lot of family travelers. It should not. This is what three trips with three children under 10 taught me about the safest neighborhoods, the most surprising kid-friendly attractions, and the tacos everyone over age 4 will eat.',
 'https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?auto=format&fit=crop&w=1200&q=80',
 'Mexico City Metro Area','Mexico City','Mexico',1900,'USD','PUBLISHED',1,2,8,'EXPERIENCING',10,4,'Year-round mild climate',1),

-- ── Ana Kowalski (u7) ──────────────────────────────────────
('b0000012-0000-4000-8000-000000000000','a0000007-0000-4000-8000-000000000000',
 'Kraków in 48 Hours: The Food, History, and Vodka Bars Nobody Bothered to Write About',
 'Kraków is one of the most underwritten cities in Europe. The guidebooks mention the castle and Auschwitz and then run out of ideas. This guide starts where those end: the Jewish Quarter at midnight, the milk bars at 7am, and the one street that explains the whole city.',
 'https://images.unsplash.com/photo-1562883676-8c7feb83f09b?auto=format&fit=crop&w=1200&q=80',
 'Lesser Poland','Kraków','Poland',1400,'USD','PUBLISHED',1,2,8,'EXPERIENCING',5,9,'May to September',1),

('b0000013-0000-4000-8000-000000000000','a0000007-0000-4000-8000-000000000000',
 'Warsaw in a Weekend: Rebuilding, Resilience, and the Restaurant Street Nobody Mentions',
 'Warsaw was almost completely destroyed. What rose in its place is one of the most architecturally layered and emotionally honest cities in Europe. This guide is for people who want to understand it, not just photograph it.',
 'https://images.unsplash.com/photo-1519197924294-4ba991a11128?auto=format&fit=crop&w=1200&q=80',
 'Masovian','Warsaw','Poland',1400,'USD','PUBLISHED',1,1,4,'DREAMING',5,9,'May to September',2),

-- ── Raj Patel (u8) ─────────────────────────────────────────
('b0000014-0000-4000-8000-000000000000','a0000008-0000-4000-8000-000000000000',
 'Kathmandu Before the Trek: What to Do in the City That Changes Every First-Time Visitor',
 'Most trekkers spend 24 hours in Kathmandu and rush to the trailhead. This guide is for people who give it 3 days and let the city actually happen to them. The chaos is the point.',
 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=80',
 'Bagmati Province','Kathmandu','Nepal',1900,'USD','PUBLISHED',1,2,8,'PLANNING',10,12,'Oct–Dec and Mar–May',1),

-- ── Emma Larsson (u9) ──────────────────────────────────────
('b0000015-0000-4000-8000-000000000000','a0000009-0000-4000-8000-000000000000',
 'Stockholm in 3 Days: Design, Water, and the Fika Culture That Quietly Makes Life Worth Living',
 'Stockholm looks expensive from the outside and rewards the person who knows where to look. This guide is for travelers who care about aesthetics, food, and the particular Scandinavian quality of light. Three days, no crowds, no ABBA museum.',
 'https://images.unsplash.com/photo-1509356843151-3e7d96241e11?auto=format&fit=crop&w=1200&q=80',
 'Stockholm County','Stockholm','Sweden',1900,'USD','PUBLISHED',1,2,8,'DREAMING',6,8,'Swedish summer',1),

('b0000016-0000-4000-8000-000000000000','a0000009-0000-4000-8000-000000000000',
 'Copenhagen Weekend Guide: Hygge, Bikes, and the Best Restaurant Street in All of Europe',
 'Copenhagen is the city every other European city is trying to become. Clean, walkable, completely obsessed with food, and still affordable if you know what you are doing. This is a 48-hour guide that does not waste a single hour.',
 'https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?auto=format&fit=crop&w=1200&q=80',
 'Capital Region','Copenhagen','Denmark',1900,'USD','PUBLISHED',1,1,4,'DREAMING',5,9,'Late spring to early autumn',2),

-- ── David Chen (u10) ───────────────────────────────────────
('b0000017-0000-4000-8000-000000000000','a0000010-0000-4000-8000-000000000000',
 'New York by Neighborhood: The Architect''s Guide to Reading the World''s Most Obsessively Designed City',
 'New York is not a skyline. It is a thousand separate cities stacked on top of each other. This guide reads it like a building — layer by layer, neighborhood by neighborhood — with a specific opinion about every block that matters.',
 'https://images.unsplash.com/photo-1534430480872-3498386e7856?auto=format&fit=crop&w=1200&q=80',
 'New York State','New York','USA',2400,'USD','PUBLISHED',1,2,8,'DREAMING',NULL,NULL,NULL,1),

('b0000018-0000-4000-8000-000000000000','a0000010-0000-4000-8000-000000000000',
 'Chicago Architecture Guide: The American City Every Designer Must Visit Before They Fully Understand Buildings',
 'Chicago invented the modern city. Every architect knows this in theory. This guide makes you feel it in practice — the Loop from the river, the neighborhoods the textbooks skip, and the one building that explains the 20th century.',
 'https://images.unsplash.com/photo-1494522358652-f30e61a60313?auto=format&fit=crop&w=1200&q=80',
 'Illinois','Chicago','USA',1900,'USD','DRAFT',0,1,4,'DREAMING',NULL,NULL,NULL,2);

-- ════════════════════════════════════════════════════════════
-- GUIDE TAGS
-- ════════════════════════════════════════════════════════════
INSERT INTO guide_tags (guide_id, tag) VALUES
  ('b0000001-0000-4000-8000-000000000000','italy'),    ('b0000001-0000-4000-8000-000000000000','florence'),  ('b0000001-0000-4000-8000-000000000000','solo'),    ('b0000001-0000-4000-8000-000000000000','food'),
  ('b0000002-0000-4000-8000-000000000000','italy'),    ('b0000002-0000-4000-8000-000000000000','rome'),      ('b0000002-0000-4000-8000-000000000000','solo'),    ('b0000002-0000-4000-8000-000000000000','nightlife'),
  ('b0000003-0000-4000-8000-000000000000','japan'),    ('b0000003-0000-4000-8000-000000000000','tokyo'),     ('b0000003-0000-4000-8000-000000000000','culture'), ('b0000003-0000-4000-8000-000000000000','food'),
  ('b0000004-0000-4000-8000-000000000000','japan'),    ('b0000004-0000-4000-8000-000000000000','kyoto'),     ('b0000004-0000-4000-8000-000000000000','spring'),  ('b0000004-0000-4000-8000-000000000000','culture'),
  ('b0000005-0000-4000-8000-000000000000','japan'),    ('b0000005-0000-4000-8000-000000000000','osaka'),     ('b0000005-0000-4000-8000-000000000000','food'),    ('b0000005-0000-4000-8000-000000000000','24hours'),
  ('b0000006-0000-4000-8000-000000000000','portugal'), ('b0000006-0000-4000-8000-000000000000','lisbon'),    ('b0000006-0000-4000-8000-000000000000','budget'),  ('b0000006-0000-4000-8000-000000000000','food'),
  ('b0000007-0000-4000-8000-000000000000','africa'),   ('b0000007-0000-4000-8000-000000000000','cape-town'), ('b0000007-0000-4000-8000-000000000000','luxury'),  ('b0000007-0000-4000-8000-000000000000','city-break'),
  ('b0000008-0000-4000-8000-000000000000','morocco'),  ('b0000008-0000-4000-8000-000000000000','marrakech'), ('b0000008-0000-4000-8000-000000000000','luxury'),  ('b0000008-0000-4000-8000-000000000000','48hours'),
  ('b0000009-0000-4000-8000-000000000000','indonesia'),('b0000009-0000-4000-8000-000000000000','bali'),      ('b0000009-0000-4000-8000-000000000000','nomad'),   ('b0000009-0000-4000-8000-000000000000','remote-work'),
  ('b0000010-0000-4000-8000-000000000000','thailand'), ('b0000010-0000-4000-8000-000000000000','chiang-mai'),('b0000010-0000-4000-8000-000000000000','nomad'),   ('b0000010-0000-4000-8000-000000000000','remote-work'),
  ('b0000011-0000-4000-8000-000000000000','mexico'),   ('b0000011-0000-4000-8000-000000000000','cdmx'),      ('b0000011-0000-4000-8000-000000000000','family'),  ('b0000011-0000-4000-8000-000000000000','food'),
  ('b0000012-0000-4000-8000-000000000000','poland'),   ('b0000012-0000-4000-8000-000000000000','krakow'),    ('b0000012-0000-4000-8000-000000000000','food'),    ('b0000012-0000-4000-8000-000000000000','history'),
  ('b0000013-0000-4000-8000-000000000000','poland'),   ('b0000013-0000-4000-8000-000000000000','warsaw'),    ('b0000013-0000-4000-8000-000000000000','history'), ('b0000013-0000-4000-8000-000000000000','weekend'),
  ('b0000014-0000-4000-8000-000000000000','nepal'),    ('b0000014-0000-4000-8000-000000000000','kathmandu'), ('b0000014-0000-4000-8000-000000000000','trekking'),('b0000014-0000-4000-8000-000000000000','adventure'),
  ('b0000015-0000-4000-8000-000000000000','sweden'),   ('b0000015-0000-4000-8000-000000000000','stockholm'), ('b0000015-0000-4000-8000-000000000000','design'),  ('b0000015-0000-4000-8000-000000000000','scandinavia'),
  ('b0000016-0000-4000-8000-000000000000','denmark'),  ('b0000016-0000-4000-8000-000000000000','copenhagen'),('b0000016-0000-4000-8000-000000000000','food'),    ('b0000016-0000-4000-8000-000000000000','hygge'),
  ('b0000017-0000-4000-8000-000000000000','usa'),      ('b0000017-0000-4000-8000-000000000000','new-york'),  ('b0000017-0000-4000-8000-000000000000','architecture'),('b0000017-0000-4000-8000-000000000000','design'),
  ('b0000018-0000-4000-8000-000000000000','usa'),      ('b0000018-0000-4000-8000-000000000000','chicago'),   ('b0000018-0000-4000-8000-000000000000','architecture'),('b0000018-0000-4000-8000-000000000000','design');

-- ════════════════════════════════════════════════════════════
-- GUIDE PERSONAS
-- ════════════════════════════════════════════════════════════
INSERT INTO guide_personas (guide_id, persona) VALUES
  ('b0000001-0000-4000-8000-000000000000','SOLO'),('b0000001-0000-4000-8000-000000000000','LUXURY'),
  ('b0000002-0000-4000-8000-000000000000','SOLO'),
  ('b0000003-0000-4000-8000-000000000000','SOLO'),('b0000003-0000-4000-8000-000000000000','DIGITAL_NOMAD'),
  ('b0000004-0000-4000-8000-000000000000','SOLO'),('b0000004-0000-4000-8000-000000000000','FAMILY'),
  ('b0000005-0000-4000-8000-000000000000','SOLO'),
  ('b0000006-0000-4000-8000-000000000000','SOLO'),('b0000006-0000-4000-8000-000000000000','BUDGET'),
  ('b0000007-0000-4000-8000-000000000000','LUXURY'),
  ('b0000008-0000-4000-8000-000000000000','LUXURY'),('b0000008-0000-4000-8000-000000000000','SOLO'),
  ('b0000009-0000-4000-8000-000000000000','DIGITAL_NOMAD'),('b0000009-0000-4000-8000-000000000000','SOLO'),
  ('b0000010-0000-4000-8000-000000000000','DIGITAL_NOMAD'),
  ('b0000011-0000-4000-8000-000000000000','FAMILY'),
  ('b0000012-0000-4000-8000-000000000000','SOLO'),('b0000012-0000-4000-8000-000000000000','BUDGET'),
  ('b0000013-0000-4000-8000-000000000000','SOLO'),
  ('b0000014-0000-4000-8000-000000000000','SOLO'),('b0000014-0000-4000-8000-000000000000','BUDGET'),
  ('b0000015-0000-4000-8000-000000000000','SOLO'),('b0000015-0000-4000-8000-000000000000','LUXURY'),
  ('b0000016-0000-4000-8000-000000000000','SOLO'),('b0000016-0000-4000-8000-000000000000','FAMILY'),
  ('b0000017-0000-4000-8000-000000000000','SOLO'),
  ('b0000018-0000-4000-8000-000000000000','SOLO');

-- ════════════════════════════════════════════════════════════
-- GUIDE DAYS
-- 2-day guides: d001/d002 per guide; 1-day guides: d001 only
-- g01→d001,d002 | g02→d003,d004 | g03→d005,d006 | g04→d007,d008
-- g05→d009      | g06→d010,d011 | g07→d012,d013 | g08→d014,d015
-- g09→d016,d017 | g10→d018      | g11→d019,d020 | g12→d021,d022
-- g13→d023      | g14→d024,d025 | g15→d026,d027 | g16→d028
-- g17→d029,d030 | g18→d031
-- ════════════════════════════════════════════════════════════
INSERT INTO guide_days (id, guide_id, day_number, title, description) VALUES
  -- g01 Florence
  ('c0000001-0000-4000-8000-000000000000','b0000001-0000-4000-8000-000000000000',1,'Arrival and Oltrarno','Cross the bridge the tourists skip and spend your first evening in the neighborhood Florentines actually live in.'),
  ('c0000002-0000-4000-8000-000000000000','b0000001-0000-4000-8000-000000000000',2,'Art, Wine, and the Hills Above the City','The Uffizi in the morning before the crowds. Fiesole in the afternoon when the city light turns gold.'),
  -- g02 Rome
  ('c0000003-0000-4000-8000-000000000000','b0000002-0000-4000-8000-000000000000',1,'Trastevere and the Old City','The neighborhood that still feels like Rome before it became a destination.'),
  ('c0000004-0000-4000-8000-000000000000','b0000002-0000-4000-8000-000000000000',2,'Ancient Rome Without the Crowd Logic','Same monuments, different entry points, completely different experience.'),
  -- g03 Tokyo
  ('c0000005-0000-4000-8000-000000000000','b0000003-0000-4000-8000-000000000000',1,'Shimokitazawa and the City Underneath','The neighborhood that Tokyo''s creative class calls home, and the reason I keep coming back.'),
  ('c0000006-0000-4000-8000-000000000000','b0000003-0000-4000-8000-000000000000',2,'Yanaka and the Morning City','Tokyo''s best-preserved old neighborhood, best experienced before 9am with coffee and no plans.'),
  -- g04 Kyoto
  ('c0000007-0000-4000-8000-000000000000','b0000004-0000-4000-8000-000000000000',1,'The Blossoms Nobody Photographs','The viewing spots that locals use when the famous paths are packed three deep.'),
  ('c0000008-0000-4000-8000-000000000000','b0000004-0000-4000-8000-000000000000',2,'Temples, Tofu, and the Long Walk Back','A full day in Arashiyama done the way it deserves to be done — slowly, with good shoes and no agenda.'),
  -- g05 Osaka (1 day)
  ('c0000009-0000-4000-8000-000000000000','b0000005-0000-4000-8000-000000000000',1,'One Day in Osaka: Eat Everything, Regret Nothing','Dotonbori for the chaos, Kuromon for the food, Shinsekai for the atmosphere. Do not miss the last train.'),
  -- g06 Lisbon
  ('c0000010-0000-4000-8000-000000000000','b0000006-0000-4000-8000-000000000000',1,'Alfama and the Morning Trams','The historic quarter on foot before 10am, then the viewpoints when everyone else is still having breakfast.'),
  ('c0000011-0000-4000-8000-000000000000','b0000006-0000-4000-8000-000000000000',2,'LX Factory and the Belém Route','The creative market that opened in a former factory, and the neighborhood that explains why Lisbon became Lisbon.'),
  -- g07 Cape Town
  ('c0000012-0000-4000-8000-000000000000','b0000007-0000-4000-8000-000000000000',1,'Bo-Kaap and the Atlantic Seaboard','The most colorful neighborhood in Africa and the coastal drive that will make you rethink every city you have been to.'),
  ('c0000013-0000-4000-8000-000000000000','b0000007-0000-4000-8000-000000000000',2,'Table Mountain and the Winelands','The hike that changes how you see Cape Town, and the wine valley an hour east that most visitors miss entirely.'),
  -- g08 Marrakech
  ('c0000014-0000-4000-8000-000000000000','b0000008-0000-4000-8000-000000000000',1,'Into the Medina: Reading the Souk','How to navigate the souk without a guide, a map, or the wrong expectations.'),
  ('c0000015-0000-4000-8000-000000000000','b0000008-0000-4000-8000-000000000000',2,'Rooftops, Hammams, and the Palmeraie','The rituals that make Marrakech worth the trip, and how to do each one without being overcharged.'),
  -- g09 Bali
  ('c0000016-0000-4000-8000-000000000000','b0000009-0000-4000-8000-000000000000',1,'Canggu: Setting Up and Slowing Down','The neighborhood that holds up after a month, and the cafes that actually have the wifi they advertise.'),
  ('c0000017-0000-4000-8000-000000000000','b0000009-0000-4000-8000-000000000000',2,'Ubud for a Day: When You Need to Remember Why You Came','An inland reset when Canggu starts feeling like a co-working space with palm trees.'),
  -- g10 Chiang Mai (1 day)
  ('c0000018-0000-4000-8000-000000000000','b0000010-0000-4000-8000-000000000000',1,'First Week Setup: The Neighborhoods, the Cafes, the Rules','How to orient yourself in a city that rewards patience and punishes rush.'),
  -- g11 Mexico City
  ('c0000019-0000-4000-8000-000000000000','b0000011-0000-4000-8000-000000000000',1,'Roma Norte and Condesa: The Design-Forward Core','The two neighborhoods every architecture and food person visits first, and for good reason.'),
  ('c0000020-0000-4000-8000-000000000000','b0000011-0000-4000-8000-000000000000',2,'Coyoacán and the Southern City','Frida Kahlo''s neighborhood, the best market in Mexico City, and the taco that my youngest still talks about.'),
  -- g12 Kraków
  ('c0000021-0000-4000-8000-000000000000','b0000012-0000-4000-8000-000000000000',1,'Kazimierz: The Jewish Quarter After Dark','The neighborhood that survived and reinvented itself, best experienced from 6pm when the day-trippers leave.'),
  ('c0000022-0000-4000-8000-000000000000','b0000012-0000-4000-8000-000000000000',2,'Wawel, Milk Bars, and the Pierogarnia Question','The castle, the communist-era canteens, and the very strong opinion I have about where to eat pierogi.'),
  -- g13 Warsaw (1 day)
  ('c0000023-0000-4000-8000-000000000000','b0000013-0000-4000-8000-000000000000',1,'From the Old Town to Praga: A City in Two Acts','The reconstructed old town and the raw, ungentrified neighborhood across the river. One day, two completely different cities.'),
  -- g14 Kathmandu
  ('c0000024-0000-4000-8000-000000000000','b0000014-0000-4000-8000-000000000000',1,'Thamel and Beyond: The City''s Nerve Center','Where everyone lands, and how to leave it before it is all you see of Kathmandu.'),
  ('c0000025-0000-4000-8000-000000000000','b0000014-0000-4000-8000-000000000000',2,'Pashupatinath, Boudhanath, and the Slower City','Two of the most sacred sites in Asia, done at the pace that actually lets them land.'),
  -- g15 Stockholm
  ('c0000026-0000-4000-8000-000000000000','b0000015-0000-4000-8000-000000000000',1,'Södermalm: The Design District That Isn''t Marketed As One','The neighborhood where Stockholm''s designers live, work, and go for fika at 3pm on a Tuesday.'),
  ('c0000027-0000-4000-8000-000000000000','b0000015-0000-4000-8000-000000000000',2,'Gamla Stan and the Archipelago Morning','The old town before 9am when you have it almost to yourself, and a boat to the islands before lunch.'),
  -- g16 Copenhagen (1 day)
  ('c0000028-0000-4000-8000-000000000000','b0000016-0000-4000-8000-000000000000',1,'Nørreport to Nørrebro: One Day, No Car, No Regrets','By bike through the food market, the cemetery that is actually a park, and the street that changed how I think about restaurants.'),
  -- g17 New York
  ('c0000029-0000-4000-8000-000000000000','b0000017-0000-4000-8000-000000000000',1,'Lower Manhattan: The Layer Cake','Five hundred years of urban history stacked into a square mile. This is how to read it.'),
  ('c0000030-0000-4000-8000-000000000000','b0000017-0000-4000-8000-000000000000',2,'Brooklyn: The City New York Is Becoming','The neighborhoods east of the bridge where the city''s next chapter is being written right now.'),
  -- g18 Chicago (1 day)
  ('c0000031-0000-4000-8000-000000000000','b0000018-0000-4000-8000-000000000000',1,'The Loop, the River, and the Architecture Boat','The route every architect takes the first time and the reason they all come back.');

-- ════════════════════════════════════════════════════════════
-- GUIDE BLOCKS  (2 per day, 62 total)
-- Columns: id, day_id, position, title, description, block_type, block_category
-- Day→Block mapping:
-- d001→bl001,bl002 | d002→bl003,bl004 | d003→bl005,bl006 | d004→bl007,bl008
-- d005→bl009,bl010 | d006→bl011,bl012 | d007→bl013,bl014 | d008→bl015,bl016
-- d009→bl017,bl018 | d010→bl019,bl020 | d011→bl021,bl022 | d012→bl023,bl024
-- d013→bl025,bl026 | d014→bl027,bl028 | d015→bl029,bl030 | d016→bl031,bl032
-- d017→bl033,bl034 | d018→bl035,bl036 | d019→bl037,bl038 | d020→bl039,bl040
-- d021→bl041,bl042 | d022→bl043,bl044 | d023→bl045,bl046 | d024→bl047,bl048
-- d025→bl049,bl050 | d026→bl051,bl052 | d027→bl053,bl054 | d028→bl055,bl056
-- d029→bl057,bl058 | d030→bl059,bl060 | d031→bl061,bl062
-- ════════════════════════════════════════════════════════════
INSERT INTO guide_blocks (id, day_id, position, title, description, block_type, block_category) VALUES
  -- g01/d001 Florence Day 1
  ('d0000001-0000-4000-8000-000000000000','c0000001-0000-4000-8000-000000000000',1,'Evening in Oltrarno','Start across the Ponte Vecchio, then ignore everything left of it.','ACTIVITY','ACTIVITY'),
  ('d0000002-0000-4000-8000-000000000000','c0000001-0000-4000-8000-000000000000',2,'Where to Stay: The Right Side of the Arno','Hotels in Oltrarno are quieter, cheaper, and a better base for a real Florence experience.','ACTIVITY','ACCOMMODATION'),
  -- g01/d002 Florence Day 2
  ('d0000003-0000-4000-8000-000000000000','c0000002-0000-4000-8000-000000000000',1,'The Uffizi Before the Crowds','8am entry, a specific five-room route, and out before 11am before the tour buses arrive.','ACTIVITY','ACTIVITY'),
  ('d0000004-0000-4000-8000-000000000000','c0000002-0000-4000-8000-000000000000',2,'The Wine Bar No Guidebook Mentions','The enoteca in San Niccolò where locals drink the house wine for €3. I have never seen another tourist there.','ACTIVITY','SECRET'),
  -- g02/d003 Rome Day 1
  ('d0000005-0000-4000-8000-000000000000','c0000003-0000-4000-8000-000000000000',1,'Trastevere on Foot','The neighborhood before dinner, when the light is orange and the streets are quiet.','ACTIVITY','ACTIVITY'),
  ('d0000006-0000-4000-8000-000000000000','c0000003-0000-4000-8000-000000000000',2,'Getting Around Rome: What Works, What Doesn''t','Buses, trams, walking radius, and why you should never take a taxi from Termini.','ACTIVITY','TRANSPORT'),
  -- g02/d004 Rome Day 2
  ('d0000007-0000-4000-8000-000000000000','c0000004-0000-4000-8000-000000000000',1,'Ancient Rome Without the Queue Panic','The Colosseum entrance that nobody uses, and the Forum at golden hour when it is almost empty.','ACTIVITY','ACTIVITY'),
  ('d0000008-0000-4000-8000-000000000000','c0000004-0000-4000-8000-000000000000',2,'Staying Near the Action Without Paying For It','The three neighborhoods within 20 minutes of everything that cost half the price of the centre.','ACTIVITY','ACCOMMODATION'),
  -- g03/d005 Tokyo Day 1
  ('d0000009-0000-4000-8000-000000000000','c0000005-0000-4000-8000-000000000000',1,'Shimokitazawa Afternoon','Record shops, theatre bars, coffee that takes twenty minutes and is worth every second.','ACTIVITY','ACTIVITY'),
  ('d0000010-0000-4000-8000-000000000000','c0000005-0000-4000-8000-000000000000',2,'The IC Card and the Transit Logic','How to navigate Tokyo''s rail network without ever looking confused or paying too much.','ACTIVITY','TRANSPORT'),
  -- g03/d006 Tokyo Day 2
  ('d0000011-0000-4000-8000-000000000000','c0000006-0000-4000-8000-000000000000',1,'Yanaka at Dawn','The temples, the cats, the tofu shop that opens at 7am. This is the Tokyo that survived modernization.','ACTIVITY','ACTIVITY'),
  ('d0000012-0000-4000-8000-000000000000','c0000006-0000-4000-8000-000000000000',2,'The Ryokan That Doesn''t Appear in Magazines','A family-run guesthouse in Yanaka that costs less than a business hotel and feels like a different country.','ACTIVITY','SECRET'),
  -- g04/d007 Kyoto Day 1
  ('d0000013-0000-4000-8000-000000000000','c0000007-0000-4000-8000-000000000000',1,'The Blossom Spots Nobody Photographs','Maruyama Park is not on this list. The canal path by Okazaki is.','ACTIVITY','ACTIVITY'),
  ('d0000014-0000-4000-8000-000000000000','c0000007-0000-4000-8000-000000000000',2,'Seasonal Planning: Blossom Dates and How to Read Them','How to predict peak week, book the right accommodation, and avoid the crowds without leaving the city.','ACTIVITY','SEASONAL'),
  -- g04/d008 Kyoto Day 2
  ('d0000015-0000-4000-8000-000000000000','c0000008-0000-4000-8000-000000000000',1,'Arashiyama on Foot','The bamboo grove before 7am, the temple garden after breakfast, the riverside for lunch.','ACTIVITY','ACTIVITY'),
  ('d0000016-0000-4000-8000-000000000000','c0000008-0000-4000-8000-000000000000',2,'The Machiya Guesthouse Route','Traditional townhouse accommodation in Kyoto costs less than a business hotel and tells a better story.','ACTIVITY','ACCOMMODATION'),
  -- g05/d009 Osaka Day 1
  ('d0000017-0000-4000-8000-000000000000','c0000009-0000-4000-8000-000000000000',1,'Dotonbori to Kuromon: The Full Osaka Eating Circuit','Six hours, twenty dishes, the philosophy that Osaka runs on.','ACTIVITY','ACTIVITY'),
  ('d0000018-0000-4000-8000-000000000000','c0000009-0000-4000-8000-000000000000',2,'The Osaka Insider Move','The standing sushi bar near Namba Station that locals use for lunch and tourists walk past every single time.','ACTIVITY','SECRET'),
  -- g06/d010 Lisbon Day 1
  ('d0000019-0000-4000-8000-000000000000','c0000010-0000-4000-8000-000000000000',1,'Alfama Before the Tourists','The castle, the viewpoints, and the fado bar that opens at noon for locals, not the evening show for visitors.','ACTIVITY','ACTIVITY'),
  ('d0000020-0000-4000-8000-000000000000','c0000010-0000-4000-8000-000000000000',2,'Getting Around on €1.50 a Trip','The tram network, the metro, and why the 28 tram is not the experience people think it is.','ACTIVITY','TRANSPORT'),
  -- g06/d011 Lisbon Day 2
  ('d0000021-0000-4000-8000-000000000000','c0000011-0000-4000-8000-000000000000',1,'LX Factory Sunday Market','The best market in Lisbon runs on Sunday mornings. Everything else is a very distant second.','ACTIVITY','ACTIVITY'),
  ('d0000022-0000-4000-8000-000000000000','c0000011-0000-4000-8000-000000000000',2,'Budget Accommodation That Doesn''t Feel Like Budget','The three hostels and one guesthouse I recommend without hesitation to anyone spending under €50 a night.','ACTIVITY','ACCOMMODATION'),
  -- g07/d012 Cape Town Day 1
  ('d0000023-0000-4000-8000-000000000000','c0000012-0000-4000-8000-000000000000',1,'Bo-Kaap Morning Walk','The most photographed street in Cape Town, best seen at 7am before the cameras arrive.','ACTIVITY','ACTIVITY'),
  ('d0000024-0000-4000-8000-000000000000','c0000012-0000-4000-8000-000000000000',2,'Where to Stay: Atlantic Seaboard vs City Bowl','The honest comparison between Cape Town''s two luxury hotel zones, with prices, commute times, and a strong recommendation.','ACTIVITY','ACCOMMODATION'),
  -- g07/d013 Cape Town Day 2
  ('d0000025-0000-4000-8000-000000000000','c0000013-0000-4000-8000-000000000000',1,'Table Mountain via the Back Route','The path that starts 30 minutes from the city and arrives at the summit before the cable car queue opens.','ACTIVITY','ACTIVITY'),
  ('d0000026-0000-4000-8000-000000000000','c0000013-0000-4000-8000-000000000000',2,'The Wine Farm Nobody Lists','One hour from the city, no tour buses, and a tasting room that opens at 9am. Bring a driver.','ACTIVITY','SECRET'),
  -- g08/d014 Marrakech Day 1
  ('d0000027-0000-4000-8000-000000000000','c0000014-0000-4000-8000-000000000000',1,'Souk Navigation Without Getting Lost','The logic of the Medina, the landmarks that matter, and what to do when you are definitely lost anyway.','ACTIVITY','ACTIVITY'),
  ('d0000028-0000-4000-8000-000000000000','c0000014-0000-4000-8000-000000000000',2,'Safety and Scams: The Honest Briefing','The four situations that trip up first-time Marrakech visitors, and the exact responses that work.','ACTIVITY','SAFETY'),
  -- g08/d015 Marrakech Day 2
  ('d0000029-0000-4000-8000-000000000000','c0000015-0000-4000-8000-000000000000',1,'Hammam and Rooftop Morning','The traditional bathhouse ritual, done properly, at the hammam that charges locals'' prices.','ACTIVITY','ACTIVITY'),
  ('d0000030-0000-4000-8000-000000000000','c0000015-0000-4000-8000-000000000000',2,'The Riad That Changes Your Mind About Riads','Most riads are sold as an experience and delivered as a hotel. This one is actually both.','ACTIVITY','SECRET'),
  -- g09/d016 Bali Day 1
  ('d0000031-0000-4000-8000-000000000000','c0000016-0000-4000-8000-000000000000',1,'Canggu Cafes: The Honest Ranking','Speed tested, noise tested, and price tested across 14 months. Here is what actually works.','ACTIVITY','ACTIVITY'),
  ('d0000032-0000-4000-8000-000000000000','c0000016-0000-4000-8000-000000000000',2,'Getting a SIM, a Scooter, and a Working SIM Card','The three things every digital nomad needs in the first 24 hours, and the exact way to get each one.','ACTIVITY','TRANSPORT'),
  -- g09/d017 Bali Day 2
  ('d0000033-0000-4000-8000-000000000000','c0000017-0000-4000-8000-000000000000',1,'Ubud for One Day','The rice terraces, the one temple worth the entrance fee, and the café where I finished two client proposals.','ACTIVITY','ACTIVITY'),
  ('d0000034-0000-4000-8000-000000000000','c0000017-0000-4000-8000-000000000000',2,'Villa Rental vs Hotel: The Real Calculation','With a private villa at €45 a night you get a kitchen, a pool, and no lobby. Here is how to find the good ones.','ACTIVITY','ACCOMMODATION'),
  -- g10/d018 Chiang Mai Day 1
  ('d0000035-0000-4000-8000-000000000000','c0000018-0000-4000-8000-000000000000',1,'Nimman vs Old City: Which Neighborhood Actually Works','The two zones everyone debates. The honest answer depends entirely on what you are here to do.','ACTIVITY','ACTIVITY'),
  ('d0000036-0000-4000-8000-000000000000','c0000018-0000-4000-8000-000000000000',2,'The Café That Became My Office for Six Weeks','It has the fastest wifi in Chiang Mai, charges €1.50 for a coffee, and requires no explanation.','ACTIVITY','SECRET'),
  -- g11/d019 Mexico City Day 1
  ('d0000037-0000-4000-8000-000000000000','c0000019-0000-4000-8000-000000000000',1,'Roma Norte in the Morning','The tree-lined streets, the art deco architecture, and the coffee shop that defines the neighborhood.','ACTIVITY','ACTIVITY'),
  ('d0000038-0000-4000-8000-000000000000','c0000019-0000-4000-8000-000000000000',2,'Family Safety Briefing','The neighborhoods to stay in, the ones to avoid, and how to explain Mexico City to children who are nervous.','ACTIVITY','SAFETY'),
  -- g11/d020 Mexico City Day 2
  ('d0000039-0000-4000-8000-000000000000','c0000020-0000-4000-8000-000000000000',1,'Coyoacán and Frida''s House','The Blue House, the market lunch, and the afternoon walk that is better than any museum.','ACTIVITY','ACTIVITY'),
  ('d0000040-0000-4000-8000-000000000000','c0000020-0000-4000-8000-000000000000',2,'Getting Around with Kids: Uber, Metro, and the Taxi Rule','How we moved a family of five across a city of 22 million without a rental car.','ACTIVITY','TRANSPORT'),
  -- g12/d021 Kraków Day 1
  ('d0000041-0000-4000-8000-000000000000','c0000021-0000-4000-8000-000000000000',1,'Kazimierz at Night','The Jewish Quarter after 6pm, when the day-trippers are gone and the city actually breathes.','ACTIVITY','ACTIVITY'),
  ('d0000042-0000-4000-8000-000000000000','c0000021-0000-4000-8000-000000000000',2,'Budget Sleep in a City That Doesn''t Require It','Kraków has the best price-to-quality hotel ratio in Europe. Here are the three properties I use.','ACTIVITY','ACCOMMODATION'),
  -- g12/d022 Kraków Day 2
  ('d0000043-0000-4000-8000-000000000000','c0000022-0000-4000-8000-000000000000',1,'Wawel at Dawn and the Milk Bar Lunch','The royal castle before the groups arrive, and the communist canteen that costs €3 for a full meal.','ACTIVITY','ACTIVITY'),
  ('d0000044-0000-4000-8000-000000000000','c0000022-0000-4000-8000-000000000000',2,'The Pierogarnia That Changes the Debate','Every Kraków food debate ends here. I have tested eleven places and this one wins every category.','ACTIVITY','SECRET'),
  -- g13/d023 Warsaw Day 1
  ('d0000045-0000-4000-8000-000000000000','c0000023-0000-4000-8000-000000000000',1,'Old Town to Praga: The Full City Arc','The reconstructed old town, the brutalist Palace of Culture, and the raw neighborhood across the Vistula.','ACTIVITY','ACTIVITY'),
  ('d0000046-0000-4000-8000-000000000000','c0000023-0000-4000-8000-000000000000',2,'Warsaw in Transit: Tram Lines That Actually Help','The three tram routes that cover everything, and why Warsaw''s transport is better than it gets credit for.','ACTIVITY','TRANSPORT'),
  -- g14/d024 Kathmandu Day 1
  ('d0000047-0000-4000-8000-000000000000','c0000024-0000-4000-8000-000000000000',1,'Beyond Thamel: The Real City Begins Here','The tourist zone is unavoidable on arrival. Getting out of it is the actual objective.','ACTIVITY','ACTIVITY'),
  ('d0000048-0000-4000-8000-000000000000','c0000024-0000-4000-8000-000000000000',2,'Health, Altitude, and the Pre-Trek Briefing','Altitude sickness starts at 1400m. Kathmandu is at 1400m. Here is what to watch for before you hit the trail.','ACTIVITY','SAFETY'),
  -- g14/d025 Kathmandu Day 2
  ('d0000049-0000-4000-8000-000000000000','c0000025-0000-4000-8000-000000000000',1,'Pashupatinath: The Sacred Site That Stays With You','One of the most significant Hindu temples in the world. Go in the morning, stay for two hours, bring nothing.','ACTIVITY','ACTIVITY'),
  ('d0000050-0000-4000-8000-000000000000','c0000025-0000-4000-8000-000000000000',2,'Boudhanath at Dusk','The largest stupa in Nepal, best seen at the hour when monks circle and the butter lamps are lit.','ACTIVITY','ACTIVITY'),
  -- g15/d026 Stockholm Day 1
  ('d0000051-0000-4000-8000-000000000000','c0000026-0000-4000-8000-000000000000',1,'Södermalm Design Morning','The design studios, the vintage shops, and the fika spot that Stockholm''s creative directors use.','ACTIVITY','ACTIVITY'),
  ('d0000052-0000-4000-8000-000000000000','c0000026-0000-4000-8000-000000000000',2,'The Metro Art Galleries','Stockholm''s underground stations are free art museums. Most visitors never notice. This is the specific line.','ACTIVITY','SECRET'),
  -- g15/d027 Stockholm Day 2
  ('d0000053-0000-4000-8000-000000000000','c0000027-0000-4000-8000-000000000000',1,'Gamla Stan Before 9am','The old town before it becomes a photography set. Coffee at the corner café, then an hour alone in the alleys.','ACTIVITY','ACTIVITY'),
  ('d0000054-0000-4000-8000-000000000000','c0000027-0000-4000-8000-000000000000',2,'Archipelago by Boat','The 20-minute ferry to Djurgården, then the kayak route through the inner islands. Best morning in Stockholm.','ACTIVITY','TRANSPORT'),
  -- g16/d028 Copenhagen Day 1
  ('d0000055-0000-4000-8000-000000000000','c0000028-0000-4000-8000-000000000000',1,'Torvehallerne to Nørrebro by Bike','The food market, the lakes, and Jægersborggade — the restaurant street that food writers have been quietly visiting for a decade.','ACTIVITY','ACTIVITY'),
  ('d0000056-0000-4000-8000-000000000000','c0000028-0000-4000-8000-000000000000',2,'The Copenhagen Restaurant You Book Six Weeks Out','It does not appear on most lists. It has 22 seats. I have been three times. Worth every minute of the wait.','ACTIVITY','SECRET'),
  -- g17/d029 New York Day 1
  ('d0000057-0000-4000-8000-000000000000','c0000029-0000-4000-8000-000000000000',1,'Lower Manhattan: Five Centuries in One Mile','From the Dutch street grid to the Glass House District. This is how to read the oldest part of New York.','ACTIVITY','ACTIVITY'),
  ('d0000058-0000-4000-8000-000000000000','c0000029-0000-4000-8000-000000000000',2,'Getting From JFK to Where You''re Actually Staying','The AirTrain math, the subway option, and why you should never take the cab queue at Terminal 4.','ACTIVITY','TRANSPORT'),
  -- g17/d030 New York Day 2
  ('d0000059-0000-4000-8000-000000000000','c0000030-0000-4000-8000-000000000000',1,'Brooklyn Heights to DUMBO','The brownstones, the promenade, and the walk across the bridge at the hour the light is best.','ACTIVITY','ACTIVITY'),
  ('d0000060-0000-4000-8000-000000000000','c0000030-0000-4000-8000-000000000000',2,'Where to Stay in New York Without Paying Manhattan Prices','The three Brooklyn neighborhoods within 20 minutes of Midtown that cost a third of the price.','ACTIVITY','ACCOMMODATION'),
  -- g18/d031 Chicago Day 1
  ('d0000061-0000-4000-8000-000000000000','c0000031-0000-4000-8000-000000000000',1,'The Architecture Boat Then the Loop on Foot','The river tour first, then the specific five buildings that explain what happened to American cities after 1890.','ACTIVITY','ACTIVITY'),
  ('d0000062-0000-4000-8000-000000000000','c0000031-0000-4000-8000-000000000000',2,'Getting into Chicago from O''Hare','The Blue Line is 45 minutes and costs $5. Everything else is a mistake.','ACTIVITY','TRANSPORT');

-- ════════════════════════════════════════════════════════════
-- GUIDE PLACES  (2 per block, 124 total)
-- Columns: id, block_id, position, name, description, address, latitude, longitude, category, price_level
-- ════════════════════════════════════════════════════════════
INSERT INTO guide_places (id, block_id, position, name, description, address, latitude, longitude, category, price_level) VALUES
  -- bl001 Florence Evening Oltrarno
  ('e0000001-0000-4000-8000-000000000000','d0000001-0000-4000-8000-000000000000',1,'Buca Mario','The oldest restaurant in Florence (est. 1886), two blocks off the main drag in Oltrarno. Go for the bistecca, stay for the wine list.','Piazza degli Ottaviani 16, Florence',43.7694,11.2461,'RESTAURANT',3),
  ('e0000002-0000-4000-8000-000000000000','d0000001-0000-4000-8000-000000000000',2,'Piazzale Michelangelo','The viewpoint everyone goes to, but at 7pm in shoulder season it is still stunning. Walk up rather than taking the bus.','Piazzale Michelangelo, Florence',43.7629,11.2650,'ATTRACTION',0),
  -- bl002 Florence Accommodation
  ('e0000003-0000-4000-8000-000000000000','d0000002-0000-4000-8000-000000000000',1,'AdAstra Oltrarno','A restored 14th-century palazzo in the San Niccolò quarter. Twelve rooms, no pool, no pretension.','Via San Niccolò 68, Florence',43.7648,11.2625,'ACCOMMODATION',3),
  ('e0000004-0000-4000-8000-000000000000','d0000002-0000-4000-8000-000000000000',2,'Hotel Davanzati','Small, perfectly located, family-run. The kind of Florentine hotel that makes you understand why people come back.','Via Porta Rossa 5, Florence',43.7701,11.2532,'ACCOMMODATION',2),
  -- bl003 Florence Uffizi
  ('e0000005-0000-4000-8000-000000000000','d0000003-0000-4000-8000-000000000000',1,'Uffizi Gallery','Book the 8am slot, skip directly to Botticelli, exit through the window corridor, and be at the market by 11.','Piazzale degli Uffizi 6, Florence',43.7677,11.2553,'MUSEUM',2),
  ('e0000006-0000-4000-8000-000000000000','d0000003-0000-4000-8000-000000000000',2,'Mercato Centrale','The covered market where locals buy the meat and vegetables that become the next day''s menus. The upstairs food court is a trap.','Piazza del Mercato Centrale, Florence',43.7764,11.2534,'SHOPPING',1),
  -- bl004 Florence Secret Wine Bar
  ('e0000007-0000-4000-8000-000000000000','d0000004-0000-4000-8000-000000000000',1,'Beve Bene Wine Bar','No signage, twelve seats, the owner opens when she feels like it. The Chianti costs €3. I have never told anyone else about this.','Via San Niccolò 18, Florence',43.7644,11.2628,'CAFE',1),
  ('e0000008-0000-4000-8000-000000000000','d0000004-0000-4000-8000-000000000000',2,'Enoteca Pitti Gola e Cantina','Directly opposite the Pitti Palace, the wine list is 400 bottles deep and the staff will actually help you choose.','Piazza de'' Pitti 16, Florence',43.7653,11.2502,'RESTAURANT',3),
  -- bl005 Rome Trastevere
  ('e0000009-0000-4000-8000-000000000000','d0000005-0000-4000-8000-000000000000',1,'Da Enzo al 29','Small, no reservations after 6pm, the cacio e pepe is better than anywhere in the centre. Arrive hungry.','Via dei Vascellari 29, Rome',41.8880,12.4700,'RESTAURANT',2),
  ('e0000010-0000-4000-8000-000000000000','d0000005-0000-4000-8000-000000000000',2,'Santa Maria in Trastevere','The basilica that has been standing since the 4th century and still has 9th-century mosaics above the altar. Free. Walk in.','Piazza di Santa Maria, Trastevere, Rome',41.8895,12.4699,'ATTRACTION',0),
  -- bl006 Rome Transport
  ('e0000011-0000-4000-8000-000000000000','d0000006-0000-4000-8000-000000000000',1,'Roma Termini','The central hub. Buy a 48-hour transit pass immediately. The taxi queue outside is for people who haven''t read this guide.','Piazza dei Cinquecento, Rome',41.9009,12.5009,'TRANSPORT',1),
  ('e0000012-0000-4000-8000-000000000000','d0000006-0000-4000-8000-000000000000',2,'Tram Line 8','The one tram line in Rome worth knowing: runs from Largo di Torre Argentina through Trastevere. €1.50, runs every 8 minutes.','Largo di Torre Argentina, Rome',41.8960,12.4764,'TRANSPORT',0),
  -- bl007 Rome Ancient
  ('e0000013-0000-4000-8000-000000000000','d0000007-0000-4000-8000-000000000000',1,'The Colosseum via the Palatine Hill Entrance','Most visitors queue at the Colosseum entrance. You enter via the Palatine Hill across the street — same ticket, no queue.','Via Sacra, Rome',41.8902,12.4922,'ATTRACTION',2),
  ('e0000014-0000-4000-8000-000000000000','d0000007-0000-4000-8000-000000000000',2,'Roman Forum at 5pm','At closing time in late afternoon, the last hour in the Forum is almost private. The tour buses leave at 4.','Roman Forum, Rome',41.8925,12.4853,'ATTRACTION',2),
  -- bl008 Rome Accommodation
  ('e0000015-0000-4000-8000-000000000000','d0000008-0000-4000-8000-000000000000',1,'Hotel Santa Maria','A small cloister hotel in Trastevere. Fourteen rooms around an orange tree courtyard. Book six weeks out for the best price.','Vicolo del Piede 2, Rome',41.8870,12.4695,'ACCOMMODATION',3),
  ('e0000016-0000-4000-8000-000000000000','d0000008-0000-4000-8000-000000000000',2,'Residenza Arco de'' Tolomei','B&B in a 17th-century building, six rooms, breakfast included, five minutes from everything in Trastevere.','Via dell''Arco de'' Tolomei 27, Rome',41.8882,12.4681,'ACCOMMODATION',2),
  -- bl009 Tokyo Shimokitazawa
  ('e0000017-0000-4000-8000-000000000000','d0000009-0000-4000-8000-000000000000',1,'Bear Pond Espresso','The barista who trained under James Hoffman before opening this tiny counter. The espresso takes six minutes. Worth it.','2-36-12 Kitazawa, Setagaya, Tokyo',35.6611,139.6676,'CAFE',1),
  ('e0000018-0000-4000-8000-000000000000','d0000009-0000-4000-8000-000000000000',2,'Village Vanguard Shimokitazawa','Not a music store — it is a concept store that feels like someone ransacked a library and a toy shop at once. A Tokyo institution.','2-10-15 Kitazawa, Setagaya, Tokyo',35.6614,139.6671,'SHOPPING',1),
  -- bl010 Tokyo Transport
  ('e0000019-0000-4000-8000-000000000000','d0000010-0000-4000-8000-000000000000',1,'Shinjuku Station West Exit','The gateway to the IC card machines, the express lines, and the logic of Tokyo''s rail grid. Spend 10 minutes here before anything else.','1-1 Nishishinjuku, Shinjuku, Tokyo',35.6896,139.7006,'TRANSPORT',0),
  ('e0000020-0000-4000-8000-000000000000','d0000010-0000-4000-8000-000000000000',2,'Pasmo Card Machine','Located on every platform. Top up ¥3000, tap in and out everywhere, never buy another ticket.','Any Tokyo metro station',35.6762,139.6503,'TRANSPORT',0),
  -- bl011 Tokyo Yanaka
  ('e0000021-0000-4000-8000-000000000000','d0000011-0000-4000-8000-000000000000',1,'Yanaka Cemetery Morning Walk','Not morbid — beautiful. Cherry trees, temple cats, stone lanterns, and the sense that Tokyo was once a very different city.','Yanaka, Taito, Tokyo',35.7267,139.7661,'PARK',0),
  ('e0000022-0000-4000-8000-000000000000','d0000011-0000-4000-8000-000000000000',2,'Kayaba Coffee','Open since 1938. Egg salad sandwich and hot coffee at a wooden table while Tokyo moves outside. ¥600 total. Go.','6-1-29 Yanaka, Taito, Tokyo',35.7236,139.7693,'CAFE',1),
  -- bl012 Tokyo Secret Ryokan
  ('e0000023-0000-4000-8000-000000000000','d0000012-0000-4000-8000-000000000000',1,'Sawanoya Ryokan','A family-run guesthouse in Yanaka with eight rooms, shared baths, and a garden. ¥8,500 per night. No Instagram presence.','2-3-11 Yanaka, Taito, Tokyo',35.7255,139.7672,'ACCOMMODATION',2),
  ('e0000024-0000-4000-8000-000000000000','d0000012-0000-4000-8000-000000000000',2,'Hanare Hotel','Rooms scattered through Yanaka''s shotengai. You check in at the public bath and breakfast is at the neighbourhood café.','6-15-23 Yanaka, Taito, Tokyo',35.7258,139.7669,'ACCOMMODATION',3),
  -- bl013 Kyoto Blossom Spots
  ('e0000025-0000-4000-8000-000000000000','d0000013-0000-4000-8000-000000000000',1,'Okazaki Canal','The canal path parallel to Heian Shrine is lined with cherry trees and, critically, ignored by most tour itineraries.','Okazaki, Sakyo, Kyoto',35.0167,135.7825,'PARK',0),
  ('e0000026-0000-4000-8000-000000000000','d0000013-0000-4000-8000-000000000000',2,'Nishiki Market','The covered food market locals call Kyoto''s kitchen. Best visited early morning before the tourist traffic.','Nishiki-koji, Nakagyo, Kyoto',35.0049,135.7648,'SHOPPING',1),
  -- bl014 Kyoto Seasonal
  ('e0000027-0000-4000-8000-000000000000','d0000014-0000-4000-8000-000000000000',1,'Japan Meteorological Agency Blossom Forecast','The national agency releases the official blossom prediction in February. This is the only forecast worth tracking.','japan-guide.com/sakura',35.6762,139.6503,'OTHER',0),
  ('e0000028-0000-4000-8000-000000000000','d0000014-0000-4000-8000-000000000000',2,'Kyoto Station Shinkansen Connections','For a weekend in Kyoto from Tokyo, the last Shinkansen back to Shinagawa departs at 21:46. Do not miss it.','Karasuma, Shimogyo, Kyoto',34.9856,135.7588,'TRANSPORT',2),
  -- bl015 Kyoto Arashiyama
  ('e0000029-0000-4000-8000-000000000000','d0000015-0000-4000-8000-000000000000',1,'Tenryu-ji Temple Garden','The garden, not the temple. UNESCO listed. The best moss and stone garden in Japan and a ten-minute walk from the bamboo.','68 Susukinobaba-cho, Sagatenryuji, Kyoto',35.0163,135.6727,'ATTRACTION',1),
  ('e0000030-0000-4000-8000-000000000000','d0000015-0000-4000-8000-000000000000',2,'Bamboo Grove','Go at 6:30am. Not 8am, not 9am. 6:30am is when it is silent.','Sagaogurayama, Ukyo, Kyoto',35.0170,135.6723,'ATTRACTION',0),
  -- bl016 Kyoto Accommodation
  ('e0000031-0000-4000-8000-000000000000','d0000016-0000-4000-8000-000000000000',1,'The Screen Kyoto','Twelve rooms in a machiya townhouse in central Kyoto. Minimal, textured, perfect. Book three months ahead.','640-1 Shimohorikawachō, Kamigyo, Kyoto',35.0215,135.7558,'ACCOMMODATION',4),
  ('e0000032-0000-4000-8000-000000000000','d0000016-0000-4000-8000-000000000000',2,'Piece Hostel Kyoto','The best budget accommodation in Kyoto. Spotless private rooms, excellent location, and no one will play guitar at 2am.','225 Ebisuchō, Nakagyo, Kyoto',35.0067,135.7672,'ACCOMMODATION',1),
  -- bl017 Osaka Eating Circuit
  ('e0000033-0000-4000-8000-000000000000','d0000017-0000-4000-8000-000000000000',1,'Kuromon Ichiba Market','Osaka''s kitchen market, open from 8am, eight blocks long, and worth three hours of your morning if you eat slowly.','2-4-1 Nipponbashi, Chuo, Osaka',34.6629,135.5044,'SHOPPING',1),
  ('e0000034-0000-4000-8000-000000000000','d0000017-0000-4000-8000-000000000000',2,'Dotonbori Canal at Night','The canal district at 9pm when the neon is fully lit and the takoyaki smell fills the street. Chaotic. Essential.','Dotonbori, Chuo, Osaka',34.6687,135.5006,'ATTRACTION',0),
  -- bl018 Osaka Secret
  ('e0000035-0000-4000-8000-000000000000','d0000018-0000-4000-8000-000000000000',1,'Sushi Yoshino (Standing Counter)','Twelve seats at a counter, no English menu, best omakase lunch in Osaka for ¥4,500. The queue forms at 11:45am.','1-7-8 Nanbasennichimae, Chuo, Osaka',34.6661,135.5014,'RESTAURANT',3),
  ('e0000036-0000-4000-8000-000000000000','d0000018-0000-4000-8000-000000000000',2,'Shinsekai at 10pm','The neighbourhood that Osaka forgot to gentrify. Pachinko parlours, skewered meat, and the atmosphere of a city still enjoying itself.','Shinsekai, Naniwa, Osaka',34.6519,135.5063,'ATTRACTION',1),
  -- bl019 Lisbon Alfama
  ('e0000037-0000-4000-8000-000000000000','d0000019-0000-4000-8000-000000000000',1,'Miradouro da Graça','The best viewpoint in Lisbon and the only one with a café that serves wine at 7am.','Largo da Graça, Lisbon',38.7157,-9.1296,'ATTRACTION',0),
  ('e0000038-0000-4000-8000-000000000000','d0000019-0000-4000-8000-000000000000',2,'A Baiuca Fado House','A fado house run by the family that has sung there since 1935. Dinner is included, reservations are essential, and it is nothing like the tourist version.','Rua de São Miguel 20, Lisbon',38.7111,-9.1310,'RESTAURANT',2),
  -- bl020 Lisbon Transport
  ('e0000039-0000-4000-8000-000000000000','d0000020-0000-4000-8000-000000000000',1,'Lisboa Viva Card','The contactless transit card. Buy it at any metro station for €0.50 and top up. €1.50 per journey, works on trams, metro, and buses.','Cais do Sodré Metro Station, Lisbon',38.7066,-9.1450,'TRANSPORT',0),
  ('e0000040-0000-4000-8000-000000000000','d0000020-0000-4000-8000-000000000000',2,'Ferry to Cacilhas','The 10-minute river ferry that locals take and tourists skip. €1.35 each way, best view of Lisbon.','Cais do Sodré Ferry Terminal, Lisbon',38.7070,-9.1450,'TRANSPORT',0),
  -- bl021 Lisbon LX Factory
  ('e0000041-0000-4000-8000-000000000000','d0000021-0000-4000-8000-000000000000',1,'LX Factory Sunday Market','A converted 19th-century factory with independent designers, a vinyl stall, and the best brunch queue in Lisbon. Go before noon.','Rua Rodrigues de Faria 103, Lisbon',38.7060,-9.1739,'SHOPPING',1),
  ('e0000042-0000-4000-8000-000000000000','d0000021-0000-4000-8000-000000000000',2,'Pastéis de Belém','The original custard tart bakery, open since 1837. Yes, there is a queue. No, the other places are not the same.','Rua de Belém 84-92, Lisbon',38.6978,-9.2033,'CAFE',1),
  -- bl022 Lisbon Budget Accommodation
  ('e0000043-0000-4000-8000-000000000000','d0000022-0000-4000-8000-000000000000',1,'Casa Amora','A guesthouse in Mouraria with seven rooms and the city''s best breakfast terrace. €65 a night in shoulder season.','Rua do Arco do Marquês de Alegrete 10, Lisbon',38.7175,-9.1336,'ACCOMMODATION',2),
  ('e0000044-0000-4000-8000-000000000000','d0000022-0000-4000-8000-000000000000',2,'Home Lisbon Hostel','The best budget stay in the city, consistently. Private room, clean, excellent location, no downsides.','Rua de São Nicolau 13, Lisbon',38.7090,-9.1380,'ACCOMMODATION',1),
  -- bl023 Cape Town Bo-Kaap
  ('e0000045-0000-4000-8000-000000000000','d0000023-0000-4000-8000-000000000000',1,'Bo-Kaap Museum','The oldest house in the neighbourhood, now a museum about the Cape Malay community. Fifteen minutes and deeply worth it.','71 Wale Street, Bo-Kaap, Cape Town',-33.9244,18.4148,'MUSEUM',1),
  ('e0000046-0000-4000-8000-000000000000','d0000023-0000-4000-8000-000000000000',2,'Biesmiellah Restaurant','Cape Malay cuisine in Bo-Kaap, open since 1965. The curry here is the reason the neighbourhood became famous for food.','2 Upper Wale Street, Cape Town',-33.9246,18.4153,'RESTAURANT',2),
  -- bl024 Cape Town Accommodation
  ('e0000047-0000-4000-8000-000000000000','d0000024-0000-4000-8000-000000000000',1,'The Silo Hotel','The former grain elevator on the V&A Waterfront, converted into one of Africa''s most architecturally significant hotels. Arrive for sundown.','Silo Square, V&A Waterfront, Cape Town',-33.9073,18.4202,'ACCOMMODATION',4),
  ('e0000048-0000-4000-8000-000000000000','d0000024-0000-4000-8000-000000000000',2,'Gorgeous George Hotel','Boutique hotel in the City Bowl, a 15-minute walk from everything and 40% cheaper than the waterfront hotels.','118 St George''s Mall, Cape Town',-33.9248,18.4222,'ACCOMMODATION',3),
  -- bl025 Cape Town Table Mountain
  ('e0000049-0000-4000-8000-000000000000','d0000025-0000-4000-8000-000000000000',1,'India Venster Trail','The 2.5-hour route up the back of Table Mountain. Quieter, more dramatic, and you arrive at the same summit as the cable car.','Table Mountain, Cape Town',-33.9568,18.4041,'PARK',0),
  ('e0000050-0000-4000-8000-000000000000','d0000025-0000-4000-8000-000000000000',2,'Boulders Beach','The penguin colony 45 minutes from the city. Adults €12, children free. Go in the afternoon when the light is right.','Boulders Beach, Simonstown, Cape Town',-34.1979,18.4513,'ATTRACTION',1),
  -- bl026 Cape Town Secret Wine Farm
  ('e0000051-0000-4000-8000-000000000000','d0000026-0000-4000-8000-000000000000',1,'Hout Bay Harbour','The fishing harbour 20 minutes from the city centre. Grilled snoek, ocean views, and not a tour bus in sight.','Hout Bay Harbour, Cape Town',-34.0487,18.3543,'RESTAURANT',1),
  ('e0000052-0000-4000-8000-000000000000','d0000026-0000-4000-8000-000000000000',2,'Babylonstoren','The wine farm and garden estate in Franschhoek that most visitors miss because it requires planning. Plan.','Klapmuts Road, Simondium, Franschhoek',-33.8403,19.0041,'ATTRACTION',3),
  -- bl027 Marrakech Souk Navigation
  ('e0000053-0000-4000-8000-000000000000','d0000027-0000-4000-8000-000000000000',1,'Djemaa el-Fna','The main square at midday, not at night. The daytime version is quieter, stranger, and more honest.','Djemaa el-Fna, Marrakech',31.6258,-7.9892,'ATTRACTION',0),
  ('e0000054-0000-4000-8000-000000000000','d0000027-0000-4000-8000-000000000000',2,'Souk Semmarine','The main thoroughfare of the souk and the one street everyone enters without understanding the logic. This guide explains the logic.','Souk Semmarine, Medina, Marrakech',31.6294,-7.9877,'SHOPPING',1),
  -- bl028 Marrakech Safety
  ('e0000055-0000-4000-8000-000000000000','d0000028-0000-4000-8000-000000000000',1,'Marrakech Airport Taxi Rank','Fixed-rate taxis are on the right as you exit. The rate to the Medina is 70 MAD, not 300.','Menara Airport, Marrakech',31.6069,-8.0363,'TRANSPORT',1),
  ('e0000056-0000-4000-8000-000000000000','d0000028-0000-4000-8000-000000000000',2,'Pharmacie de Garde (Night Pharmacy)','The 24-hour pharmacy rotation. Required reading before any trip to Morocco, especially if you plan to eat adventurously.','Various locations, Medina, Marrakech',31.6295,-7.9811,'OTHER',0),
  -- bl029 Marrakech Hammam
  ('e0000057-0000-4000-8000-000000000000','d0000029-0000-4000-8000-000000000000',1,'Hammam el-Bacha','The grande hammam of Marrakech, operational since 1917 and still serving locals. 20 MAD entry. Bring your own towel.','20 Rue Fatima Zahra, Medina, Marrakech',31.6349,-7.9893,'OTHER',0),
  ('e0000058-0000-4000-8000-000000000000','d0000029-0000-4000-8000-000000000000',2,'Dar Cherifa Rooftop','A 16th-century riad converted into a cultural café. The rooftop is the best place in the Medina to drink mint tea and understand what is below you.','8 Derb Chorfa Lakbir, Mouassine, Marrakech',31.6323,-7.9891,'CAFE',1),
  -- bl030 Marrakech Secret Riad
  ('e0000059-0000-4000-8000-000000000000','d0000030-0000-4000-8000-000000000000',1,'Dar Anika Riad','Nine rooms around a central courtyard with a plunge pool. No restaurant, no concierge pressure, exceptional breakfast. €120 in shoulder season.','Derb Jedid 18, Bab Doukkala, Marrakech',31.6361,-7.9897,'ACCOMMODATION',3),
  ('e0000060-0000-4000-8000-000000000000','d0000030-0000-4000-8000-000000000000',2,'Le Jardin Restaurant','Hidden in a garden behind an unmarked door in the Mouassine quarter. One of the best lunches in Marrakech, twelve tables, garden seating only.','32 Souk el Jeld, Mouassine, Marrakech',31.6328,-7.9899,'RESTAURANT',2),
  -- bl031 Bali Cafes
  ('e0000061-0000-4000-8000-000000000000','d0000031-0000-4000-8000-000000000000',1,'Café Vida Canggu','The strongest wifi in Canggu (tested at 87mbps), cold brew, rice bowls, 60 seats, and the only café I know that keeps its hours.','Jl. Pantai Batu Bolong 56, Canggu, Bali',-8.6530,115.1349,'CAFE',1),
  ('e0000062-0000-4000-8000-000000000000','d0000031-0000-4000-8000-000000000000',2,'Dojo Coworking Space','The benchmark for coworking in Canggu. Day pass $15, monthly membership $120, excellent community board.','Jl. Batu Mejan 57, Canggu, Bali',-8.6520,115.1358,'OTHER',1),
  -- bl032 Bali Transport
  ('e0000063-0000-4000-8000-000000000000','d0000032-0000-4000-8000-000000000000',1,'Scooter Rental on Jl. Sunset Road','The rental cluster at the north end of Sunset Road. 75,000 IDR per day for a Honda Beat. Bring your international licence.','Jl. Sunset Road, Seminyak, Bali',-8.6909,115.1673,'TRANSPORT',1),
  ('e0000064-0000-4000-8000-000000000000','d0000032-0000-4000-8000-000000000000',2,'Grab App (Southeast Asia Uber)','Set it up before you land. Always cheaper than the taxi rank, and the drivers know where everything is.','App-based, Bali',-8.6500,115.2167,'TRANSPORT',0),
  -- bl033 Bali Ubud
  ('e0000065-0000-4000-8000-000000000000','d0000033-0000-4000-8000-000000000000',1,'Tegallalang Rice Terraces','30 minutes north of Ubud. Go at 7am before the drone operators and the café swings. Bring water.','Tegallalang, Gianyar Regency, Bali',-8.4328,115.2795,'ATTRACTION',0),
  ('e0000066-0000-4000-8000-000000000000','d0000033-0000-4000-8000-000000000000',2,'Room4Dessert Ubud','The dessert-only restaurant in Ubud by Will Goldfarb. Eight courses of textures and temperatures that make every other restaurant feel unambitious.','Jl. Raya Sanggingan, Ubud, Bali',-8.5000,115.2564,'RESTAURANT',4),
  -- bl034 Bali Villa Accommodation
  ('e0000067-0000-4000-8000-000000000000','d0000034-0000-4000-8000-000000000000',1,'The Layar Private Villas','Six stand-alone villas in Seminyak, each with a private pool. The booking goes through the hotel directly and is cheaper than the OTA.','Jl. Drupadi No. 8, Seminyak, Bali',-8.6912,115.1629,'ACCOMMODATION',4),
  ('e0000068-0000-4000-8000-000000000000','d0000034-0000-4000-8000-000000000000',2,'RedDoorz Canggu','For the budget end: a clean, basic, well-managed guesthouse near the main café strip. $28/night with breakfast.','Jl. Batu Bolong, Canggu, Bali',-8.6541,115.1348,'ACCOMMODATION',1),
  -- bl035 Chiang Mai Neighborhoods
  ('e0000069-0000-4000-8000-000000000000','d0000035-0000-4000-8000-000000000000',1,'Nimman Road (Nimmanhaemin)','The design district with the best coffee and the newest co-working spaces. Good for the first month. Gets repetitive.','Nimmanhaemin Road, Chiang Mai',18.8000,98.9680,'ATTRACTION',0),
  ('e0000070-0000-4000-8000-000000000000','d0000035-0000-4000-8000-000000000000',2,'Wat Chedi Luang','The temple in the Old City built in 1391, partially destroyed by earthquake in 1545, still standing. The monk chat program runs weekdays.','Phra Pokklao Road, Old City, Chiang Mai',18.7877,98.9882,'ATTRACTION',0),
  -- bl036 Chiang Mai Secret Café
  ('e0000071-0000-4000-8000-000000000000','d0000036-0000-4000-8000-000000000000',1,'Ristr8to Lab','The best espresso in Chiang Mai, possibly in Thailand. The wifi hits 95mbps. The staff will not rush you.','15/3 Nimmanhaemin Soi 3, Chiang Mai',18.8012,98.9685,'CAFE',1),
  ('e0000072-0000-4000-8000-000000000000','d0000036-0000-4000-8000-000000000000',2,'Saturday Walking Street','The night market that Chiang Mai locals actually attend. The tourist night market is 15 minutes away and half as interesting.','Wualai Road, Chiang Mai',18.7798,98.9892,'SHOPPING',1),
  -- bl037 Mexico City Roma Norte
  ('e0000073-0000-4000-8000-000000000000','d0000037-0000-4000-8000-000000000000',1,'Café Nin','The art deco café in Roma Norte where half of Mexico City''s creative class works between 9am and noon. Excellent chilaquiles.','Tonalá 33, Roma Norte, Mexico City',19.4208,-99.1615,'CAFE',2),
  ('e0000074-0000-4000-8000-000000000000','d0000037-0000-4000-8000-000000000000',2,'Mercado de Medellín','The neighbourhood market that tourists haven''t fully discovered yet. Two aisles of fresh produce and one exceptional taco stand at the back.','Coahuila 90, Roma Sur, Mexico City',19.4113,-99.1645,'SHOPPING',0),
  -- bl038 Mexico City Safety
  ('e0000075-0000-4000-8000-000000000000','d0000038-0000-4000-8000-000000000000',1,'Uber Mexico City','Use Uber exclusively. Street taxis have a complicated history in CDMX and Uber has a clean safety record in Roma and Condesa.','App-based, Mexico City',19.4270,-99.1676,'TRANSPORT',1),
  ('e0000076-0000-4000-8000-000000000000','d0000038-0000-4000-8000-000000000000',2,'Sanborn''s Hospital ABC','The American hospital 10 minutes from Roma Norte, with English-speaking emergency staff. Save the number before you land.','Sur 136 No. 116, Observatorio, Mexico City',19.3996,-99.1878,'OTHER',0),
  -- bl039 Mexico City Coyoacán
  ('e0000077-0000-4000-8000-000000000000','d0000039-0000-4000-8000-000000000000',1,'Museo Frida Kahlo','The Blue House where Kahlo was born, lived, and died. Book at least a week ahead and arrive at opening time. Four rooms, two hours.','Londres 247, Del Carmen, Coyoacán, Mexico City',19.3551,-99.1627,'MUSEUM',2),
  ('e0000078-0000-4000-8000-000000000000','d0000039-0000-4000-8000-000000000000',2,'Mercado de Coyoacán','The market next to the Blue House that every visitor walks through and not enough of them stop to eat in. The tostadas are the reason.','Ignacio Allende, Coyoacán, Mexico City',19.3543,-99.1618,'RESTAURANT',0),
  -- bl040 Mexico City Family Transport
  ('e0000079-0000-4000-8000-000000000000','d0000040-0000-4000-8000-000000000000',1,'Mexico City Metro Line 3','Line 3 (olive green) runs from Tlatelolco through Centro Histórico and south to Coyoacán. 5 pesos. Completely safe with children.','Various stations, Mexico City',19.4270,-99.1676,'TRANSPORT',0),
  ('e0000080-0000-4000-8000-000000000000','d0000040-0000-4000-8000-000000000000',2,'Metrobús Line 1','The rapid bus system that runs the length of Insurgentes from north to south. 7 pesos, air-conditioned, stroller-accessible.','Insurgentes, Mexico City',19.4270,-99.1676,'TRANSPORT',0),
  -- bl041 Kraków Kazimierz Night
  ('e0000081-0000-4000-8000-000000000000','d0000041-0000-4000-8000-000000000000',1,'Singer Café','The Jewish Quarter café that opened in a former sewing machine repair shop and hasn''t changed since 1993. Candles, jazz, vodka.','ul. Estery 20, Kazimierz, Kraków',50.0501,19.9460,'CAFE',1),
  ('e0000082-0000-4000-8000-000000000000','d0000041-0000-4000-8000-000000000000',2,'Restauracja Wesele','Traditional Polish cooking done with intention. The barszcz and żurek are the two things you eat on your first night.','ul. Rynek Główny 10, Stare Miasto, Kraków',50.0621,19.9374,'RESTAURANT',2),
  -- bl042 Kraków Budget Accommodation
  ('e0000083-0000-4000-8000-000000000000','d0000042-0000-4000-8000-000000000000',1,'Hostel Flamingo','The best-run hostel in Kraków. Private rooms from €28, breakfast included, five minutes from Kazimierz.','ul. Szewska 4, Stare Miasto, Kraków',50.0614,19.9357,'ACCOMMODATION',1),
  ('e0000084-0000-4000-8000-000000000000','d0000042-0000-4000-8000-000000000000',2,'Hotel Wentzl','The boutique hotel on the Main Square that costs less than you expect for what it delivers. Book the corner room.','Rynek Główny 19, Stare Miasto, Kraków',50.0617,19.9372,'ACCOMMODATION',3),
  -- bl043 Kraków Wawel & Milk Bar
  ('e0000085-0000-4000-8000-000000000000','d0000043-0000-4000-8000-000000000000',1,'Wawel Royal Castle','The castle and cathedral complex on the hill above the Vistula. Arrive at 9am when the ticket office opens. Skip the state rooms, do the dragon cave.','Wawel 5, Stare Miasto, Kraków',50.0541,19.9354,'ATTRACTION',2),
  ('e0000086-0000-4000-8000-000000000000','d0000043-0000-4000-8000-000000000000',2,'Bar Mleczny Pod Temidą (Milk Bar)','Communist-era canteen in operation since 1956. Full meal for 18 PLN (€4). Bigos, pierogi, and the surreal experience of eating under fluorescent light with half the city.','ul. Grodzka 43, Kraków',50.0597,19.9378,'RESTAURANT',0),
  -- bl044 Kraków Secret Pierogi
  ('e0000087-0000-4000-8000-000000000000','d0000044-0000-4000-8000-000000000000',1,'Pierogi Mr. Vincent','The best pierogi in Kraków. Yes, this is a strong statement. Eleven variants, eaten at a wooden counter, 3 PLN each.','ul. Bonerowska 7, Kazimierz, Kraków',50.0511,19.9469,'RESTAURANT',1),
  ('e0000088-0000-4000-8000-000000000000','d0000044-0000-4000-8000-000000000000',2,'Jama Michalika Café','The art nouveau café that has been open since 1895 and where the Polish literary intelligentsia used to argue. The hot chocolate is serious.','ul. Floriańska 45, Stare Miasto, Kraków',50.0641,19.9406,'CAFE',2),
  -- bl045 Warsaw Old Town to Praga
  ('e0000089-0000-4000-8000-000000000000','d0000045-0000-4000-8000-000000000000',1,'Warsaw Old Town Square','The entire old town was rebuilt from scratch after 1945 using 18th-century paintings as blueprints. The recreation is the point.','Rynek Starego Miasta, Stare Miasto, Warsaw',52.2497,21.0122,'ATTRACTION',0),
  ('e0000090-0000-4000-8000-000000000000','d0000045-0000-4000-8000-000000000000',2,'Elektrownia Powiśle','The converted power station on the river bank that became a food and retail complex. Less interesting than it sounds, but the river view is not.','ul. Dobra 42, Powiśle, Warsaw',52.2362,21.0261,'SHOPPING',2),
  -- bl046 Warsaw Transport
  ('e0000091-0000-4000-8000-000000000000','d0000046-0000-4000-8000-000000000000',1,'Warsaw Central Station','The brutalist central train station, beautiful in a specific light at a specific hour. The metro Line 2 runs directly underneath.','ul. Aleje Jerozolimskie 54, Warsaw',52.2284,21.0038,'TRANSPORT',0),
  ('e0000092-0000-4000-8000-000000000000','d0000046-0000-4000-8000-000000000000',2,'Tram Line 10','Runs from Wola through the city centre to Praga. €0.80 for a 20-minute ride across the Vistula. The bridge view alone is worth it.','Various stops, Warsaw',52.2297,21.0122,'TRANSPORT',0),
  -- bl047 Kathmandu Beyond Thamel
  ('e0000093-0000-4000-8000-000000000000','d0000047-0000-4000-8000-000000000000',1,'Durbar Square','The old royal square, partially destroyed in the 2015 earthquake and partially rebuilt. The living goddess Kumari still lives in the courtyard building.','Basantapur, Kathmandu',27.7041,85.3069,'ATTRACTION',1),
  ('e0000094-0000-4000-8000-000000000000','d0000047-0000-4000-8000-000000000000',2,'OR2K Restaurant','The best vegetarian restaurant in Kathmandu and the place trekkers have been eating carbohydrates before departure since 1994.','Thamel, Kathmandu',27.7153,85.3123,'RESTAURANT',1),
  -- bl048 Kathmandu Safety
  ('e0000095-0000-4000-8000-000000000000','d0000048-0000-4000-8000-000000000000',1,'CIWEC Travel Medicine Center','The specialist travel health clinic in Kathmandu with the region''s best altitude sickness protocol. Consultation before the trek.','Lazimpat, Kathmandu',27.7207,85.3193,'OTHER',2),
  ('e0000096-0000-4000-8000-000000000000','d0000048-0000-4000-8000-000000000000',2,'Nepal Rastra Bank Currency Exchange','The official exchange rate point. Change money here, not at the airport or any street booth.','Dharmapath, Kathmandu',27.7090,85.3143,'OTHER',0),
  -- bl049 Kathmandu Sacred Sites
  ('e0000097-0000-4000-8000-000000000000','d0000049-0000-4000-8000-000000000000',1,'Pashupatinath Temple','One of the most sacred Hindu temples in the world. The burning ghats are visible from the opposite bank. Go in the morning.','Gaushala, Kathmandu',27.7105,85.3482,'ATTRACTION',1),
  ('e0000098-0000-4000-8000-000000000000','d0000049-0000-4000-8000-000000000000',2,'Swayambhunath (Monkey Temple)','The stupa on the hill west of the city. 365 steps, prayer wheels, and the best panoramic view of the Kathmandu Valley.','Swayambhu, Kathmandu',27.7148,85.2904,'ATTRACTION',1),
  -- bl050 Kathmandu Boudhanath
  ('e0000099-0000-4000-8000-000000000000','d0000050-0000-4000-8000-000000000000',1,'Boudhanath Stupa','The largest stupa in Nepal, surrounded by Tibetan monasteries and butter lamp sellers. Circumambulate at dusk.','Boudha, Kathmandu',27.7215,85.3621,'ATTRACTION',0),
  ('e0000100-0000-4000-8000-000000000000','d0000050-0000-4000-8000-000000000000',2,'Stupa View Restaurant','Rooftop restaurant circling the stupa. Order Tibetan butter tea, watch the circumambulation, stay until the lamps are lit.','Boudha, Kathmandu',27.7215,85.3624,'RESTAURANT',1),
  -- bl051 Stockholm Södermalm
  ('e0000101-0000-4000-8000-000000000000','d0000051-0000-4000-8000-000000000000',1,'Drop Coffee Roasters','The roastery and café in Södermalm where Stockholm''s design community buys its beans. Single origin filter, table for two, no wifi.','Wollmar Yxkullsgatan 10, Stockholm',59.3175,18.0593,'CAFE',2),
  ('e0000102-0000-4000-8000-000000000000','d0000051-0000-4000-8000-000000000000',2,'Grandpa Vintage','The vintage shop in Södermalm that is actually edited by someone with taste. Swedish design objects and clothing from the 60s and 70s.','Hornsgatan 26, Södermalm, Stockholm',59.3174,18.0474,'SHOPPING',2),
  -- bl052 Stockholm Secret Metro Art
  ('e0000103-0000-4000-8000-000000000000','d0000052-0000-4000-8000-000000000000',1,'T-Centralen Metro Station','The oldest decorated station on the Blue Line. The white cave with blue brushwork. Free to access with a transit card.','T-Centralen, Stockholm',59.3311,18.0596,'ATTRACTION',0),
  ('e0000104-0000-4000-8000-000000000000','d0000052-0000-4000-8000-000000000000',2,'Kungsträdgården Station','The underground archaeological dig turned metro station. Roman columns, excavated ruins, and a tiled ceiling. Technically a transit stop.','Kungsträdgården, Stockholm',59.3319,18.0718,'ATTRACTION',0),
  -- bl053 Stockholm Gamla Stan
  ('e0000105-0000-4000-8000-000000000000','d0000053-0000-4000-8000-000000000000',1,'Stortorget (Great Square)','The oldest square in Stockholm, best at 7am when the cobblestones are wet from rain and the café opens at one corner.','Stortorget, Gamla Stan, Stockholm',59.3254,18.0713,'ATTRACTION',0),
  ('e0000106-0000-4000-8000-000000000000','d0000053-0000-4000-8000-000000000000',2,'Fotografiska','The photography museum on the waterfront, open until 11pm. One of the best permanent collections in Europe and the cafeteria rivals any Stockholm restaurant.','Stadsgårdshamnen 22, Stockholm',59.3176,18.0857,'MUSEUM',2),
  -- bl054 Stockholm Archipelago
  ('e0000107-0000-4000-8000-000000000000','d0000054-0000-4000-8000-000000000000',1,'Djurgårdslinjen Ferry','The archipelago ferry from Slussen to Djurgården. 10 minutes, free with the Stockholm City Card, passes four islands.','Slussen, Stockholm',59.3198,18.0718,'TRANSPORT',1),
  ('e0000108-0000-4000-8000-000000000000','d0000054-0000-4000-8000-000000000000',2,'Rosendals Trädgård','The biodynamic garden café on Djurgården that serves lunch from what it grew that morning. The cinnamon bun is the one everyone photographs.','Rosendalsterrassen 12, Djurgården, Stockholm',59.3277,18.1047,'CAFE',2),
  -- bl055 Copenhagen Nørrebro
  ('e0000109-0000-4000-8000-000000000000','d0000055-0000-4000-8000-000000000000',1,'Torvehallerne Market','The covered food market by Nørreport Station. Open from 10am, 60 stalls, the best smørrebrød in Copenhagen is at stall 14.','Frederiksborggade 21, Copenhagen',55.6870,12.5718,'SHOPPING',1),
  ('e0000110-0000-4000-8000-000000000000','d0000055-0000-4000-8000-000000000000',2,'Jægersborggade','The street in Nørrebro where Copenhagen''s best independent restaurants opened when rent was still low. All still there, still excellent.','Jægersborggade, Nørrebro, Copenhagen',55.6899,12.5524,'RESTAURANT',2),
  -- bl056 Copenhagen Secret Restaurant
  ('e0000111-0000-4000-8000-000000000000','d0000056-0000-4000-8000-000000000000',1,'Mirabelle Bakery and Restaurant','Opens at 7:30am for breakfast, transitions to lunch at noon. The sourdough and the butter alone justify the trip to Copenhagen.','Guldbergsgade 29, Nørrebro, Copenhagen',55.6920,12.5520,'RESTAURANT',2),
  ('e0000112-0000-4000-8000-000000000000','d0000056-0000-4000-8000-000000000000',2,'Assistens Cemetery','Where Kierkegaard and Hans Christian Andersen are buried, and where Copenhageners come to jog and picnic. Open daily. Strange and beautiful.','Kapelvej, Nørrebro, Copenhagen',55.6931,12.5477,'PARK',0),
  -- bl057 New York Lower Manhattan
  ('e0000113-0000-4000-8000-000000000000','d0000057-0000-4000-8000-000000000000',1,'The High Line','The elevated park on the former freight railway. Best at 7am before the tourist market opens. The architecture along the route is the real exhibit.','Gansevoort Street, Manhattan, New York',40.7480,-74.0048,'PARK',0),
  ('e0000114-0000-4000-8000-000000000000','d0000057-0000-4000-8000-000000000000',2,'55 Water Street Rooftop','The public park on top of a Manhattan skyscraper that almost no one knows exists. Free access, extraordinary view.','55 Water Street, Financial District, New York',40.7031,-74.0124,'ATTRACTION',0),
  -- bl058 New York Transport
  ('e0000115-0000-4000-8000-000000000000','d0000058-0000-4000-8000-000000000000',1,'AirTrain JFK to Jamaica Station','The connection from JFK to the subway. $8.25 to Jamaica, then $2.90 on the A train. Total: $11.15 and 60 minutes. Not $70 in a cab.','JFK Airport, Queens, New York',40.6413,-73.7781,'TRANSPORT',1),
  ('e0000116-0000-4000-8000-000000000000','d0000058-0000-4000-8000-000000000000',2,'OMNY Contactless Transit','Tap your phone or contactless card directly on the subway turnstile. No MetroCard needed since 2023.','Any NYC Subway station',40.7128,-74.0060,'TRANSPORT',0),
  -- bl059 New York Brooklyn Heights
  ('e0000117-0000-4000-8000-000000000000','d0000059-0000-4000-8000-000000000000',1,'Brooklyn Bridge Pedestrian Walk','Walk Manhattan-to-Brooklyn starting at 7am for the light. The bike lane is to the right, pedestrians left.','Centre Street on-ramp, Manhattan, New York',40.7128,-74.0059,'ATTRACTION',0),
  ('e0000118-0000-4000-8000-000000000000','d0000059-0000-4000-8000-000000000000',2,'Roberta''s Pizza','The wood-fired pizza in Bushwick that started the Brooklyn food movement. Still excellent, still worth the subway ride.','261 Moore Street, Bushwick, Brooklyn',40.7057,-73.9333,'RESTAURANT',2),
  -- bl060 New York Brooklyn Accommodation
  ('e0000119-0000-4000-8000-000000000000','d0000060-0000-4000-8000-000000000000',1,'1 Hotel Brooklyn Bridge','The sustainability-focused hotel on the DUMBO waterfront with the Manhattan skyline across the river. 20 minutes to Midtown.','60 Furman Street, DUMBO, Brooklyn',40.6996,-73.9977,'ACCOMMODATION',4),
  ('e0000120-0000-4000-8000-000000000000','d0000060-0000-4000-8000-000000000000',2,'McCarren Hotel Park Slope','The converted apartment hotel in Park Slope: kitchen included, 25 minutes to Midtown, $180/night vs $380 in Manhattan.','160 North 12th Street, Williamsburg, Brooklyn',40.7212,-73.9561,'ACCOMMODATION',2),
  -- bl061 Chicago Architecture Loop
  ('e0000121-0000-4000-8000-000000000000','d0000061-0000-4000-8000-000000000000',1,'Chicago Architecture Center River Cruise','The 90-minute boat tour narrated by licensed architects. The only way to understand Chicago''s river-level facade in one sitting.','111 East Wacker Drive, Chicago',41.8868,-87.6211,'ATTRACTION',2),
  ('e0000122-0000-4000-8000-000000000000','d0000061-0000-4000-8000-000000000000',2,'Rookery Building','The 1888 Burnham and Root building with the Frank Lloyd Wright atrium. Free lobby access. The most important interior in American architecture.','209 South LaSalle Street, The Loop, Chicago',41.8793,-87.6322,'ATTRACTION',0),
  -- bl062 Chicago Transport
  ('e0000123-0000-4000-8000-000000000000','d0000062-0000-4000-8000-000000000000',1,'O''Hare Blue Line Station','The CTA Blue Line from O''Hare to downtown runs 24 hours, takes 45 minutes, and costs $5. The cab queue costs $55 and takes the same time at rush hour.','O''Hare Airport, Chicago',41.9742,-87.9073,'TRANSPORT',1),
  ('e0000124-0000-4000-8000-000000000000','d0000062-0000-4000-8000-000000000000',2,'The "L" Loop Train','The elevated train that circles the central business district. Buy a 1-day pass ($10), ride the full loop once, and you will understand the city''s geography in 20 minutes.','Various loop stations, Chicago',41.8855,-87.6300,'TRANSPORT',1);
