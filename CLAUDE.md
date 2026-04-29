# Brooks — Travel Guide Marketplace
> Session resume file. Read this first in every new session.
> Last updated: 2026-04-14

---

## What This App Is

Brooks is a **creator-driven travel guide marketplace** combining social discovery, structured itinerary commerce, and map/calendar execution. Any signed-in user can create and sell guides — no approval gate. Travelers buy a specific published guide version and use it immediately.

**Core promise:** Follow creators you trust, buy their travel guide, execute the trip without doing the planning yourself.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Java 21 + Spring Boot 3.3.5 |
| Build | Gradle Kotlin DSL (multi-module) |
| Database | PostgreSQL 16 + Flyway migrations |
| Frontend | Next.js 14 App Router + TypeScript |
| Styling | Tailwind CSS |
| Auth | Auth0 — Regular Web App setup (`@auth0/nextjs-auth0` on web, Spring OAuth2 Resource Server on backend) |
| Payments | UniPay (Georgian PSP) — redirect-based hosted checkout, REST API, HMAC-SHA256 webhooks |
| Media | Google Cloud Storage (`GCS_BUCKET`) |
| Maps | Mapbox (web), Google Maps Places API (place validation) |
| Infra | Docker Compose + Caddy |
| Deployment target | GCP VM |
| CI | GitHub Actions — backend Gradle build/test + web lint/build |

---

## Architecture

Modular monolith — one Spring Boot process, one PostgreSQL DB, one Next.js frontend.

```
backend/          ← Spring Boot modules
web/              ← Next.js App Router (no BFF — calls REST directly)
mobile/           ← React Native (Android-first) — NOT started yet
infra/            ← Docker Compose + Caddy + env files
```

### Backend modules (all in `backend/`)

| Module | Responsibility |
|--------|---------------|
| `common` | Base entity, pagination, shared exceptions, `BusinessConstants` |
| `auth` | OAuth2 resource server, Auth0 JWT validation, SecurityConfig |
| `user` | User creation on first login (`/api/auth/callback`) |
| `profile` | Creator/user profile CRUD, follow counts, purchase counts |
| `social` | Follows, stories (guide promotions), feed |
| `guide` | Guide CRUD, Day/Block/Place CRUD, publishing, versions, preview |
| `search` | Full-text search, regional rankings |
| `purchase` | Checkout, webhook, purchase access control |
| `app` | Bootstrap, global config, Flyway migrations, seed data |

Each module follows: `api/` → `service/` → `repository/` → `domain/` → `dto/` → `event/`

### Key backend endpoints

| Method | Path | Module | Notes |
|--------|------|--------|-------|
| POST | `/api/auth/callback` | user | First-login user creation |
| GET/PUT | `/api/profiles/{username}` | profile | Profile read/update |
| POST/DELETE | `/api/follows/{userId}` | social | Follow/unfollow |
| GET | `/api/feed` | social | Feed — returns list (not paginated yet) |
| POST | `/api/stories` | social | Create guide-promotion story |
| GET/POST/PUT/DELETE | `/api/guides/**` | guide | Guide CRUD |
| GET | `/api/guides/{id}/preview` | guide | Preview (title+day count+place count only) |
| POST | `/api/guides/{id}/publish` | guide | Publish + create version snapshot |
| GET | `/api/search` | search | Full-text search |
| GET | `/api/rankings` | search | Regional rankings |
| POST | `/api/purchases/checkout` | purchase | Create UniPay order, return checkoutUrl |
| GET | `/api/purchases/my` | purchase | Buyer's purchase history |
| POST | `/api/webhooks/unipay` | purchase | UniPay webhook (HMAC-SHA256 verified) |

---

## Implementation Status by Phase

### ✅ Phase 1 — Foundation
- Auth0 JWT validation, route protection (`SecurityConfig`)
- First-login user creation via `/api/auth/callback`
- User profile CRUD
- Flyway migration pipeline (V1–V10)

### ✅ Phase 2 — Social Layer
- Follow/unfollow backend
- Story creation (guide-linked only, not standalone)
- Feed API from followed creators' stories
- Story backend enforces guide reference

### ✅ Phase 3 — Guide Authoring Backend
- Guide CRUD (title, cover, region, tags, pricing, sale price)
- Day/Block/Place CRUD with ordering
- Guide publishing — creates version snapshot (JSON stored in `guide_versions.snapshot`)
- Guide preview endpoint (enforces business rule — title + counts only)
- Guide structure: **Guide → Day → Block → Place**

### ✅ Phase 4 — Search & Rankings
- Full-text search across guides, creators, places
- Regional rankings (purchases × 2 + followers + verification bonus)
- Search indexes in V7 migration

### ✅ Phase 5 — Web Editor (partial)
Working routes:
- `/` landing page
- `/login`, `/callback`
- `/guides` — guide list
- `/guides/new` — guide creation
- `/guides/[id]/edit` — guide editor
- `/guides/[id]/view` — guide view (partial)
- `/purchases`, `/purchases/success`
- `/map`, `/notifications`, `/settings`, `/trips`, `/trips/[id]`
- `/search`, `/search/guides`, `/search/creators`, `/search/places`
- `/creators/[username]`

Placeholder/incomplete routes:
- `/feed` — shell, no live data
- `/profile`, `/profile/edit` — shell
- `/saved`

### ✅ Phase 6 — Purchases & Payments (UniPay)
- `PurchaseService` — creates UniPay order, saves `unipay_order_id`
- `UniPayService` — `createOrder()` via REST, `verifyWebhookSignature()` HMAC-SHA256
- `WebhookController` — `POST /api/webhooks/unipay`, verifies signature, marks purchase COMPLETED
- `PurchaseRepository` — `findByUnipayOrderId()`
- Idempotent webhook handling
- Purchase COMPLETED increments creator `purchase_count`
- Effective price respects active sale (sale price + optional end date)
- Platform fee: ceiling division `(price × fee% + 99) / 100`

### ❌ Not Started
- Live social feed UI
- Live profile pages
- Map discovery (creator pins, regional top-3 larger icons)
- Calendar export (Google Calendar, Apple)
- Reviews and ratings
- Notifications
- Moderation / admin panel
- Verification system (creator identity)
- Commercial place paid-inclusion logic
- Mobile app (React Native)

---

## Database Schema

Flyway migrations at `backend/app/src/main/resources/db/migration/`

| Version | File | What it does |
|---------|------|-------------|
| V1 | `create_users_table` | `users` |
| V2 | `create_user_profiles_table` | `user_profiles` |
| V3 | `create_follows_table` | `follows` |
| V4 | `create_guide_stories_table` | `guide_stories` |
| V5 | `create_guide_tables` | `guides`, `guide_tags`, `guide_days`, `guide_blocks`, `guide_places`, `guide_place_images`, `guide_versions` |
| V6 | `add_profile_map_coordinates` | lat/lng on `user_profiles` |
| V7 | `add_search_indexes` | Full-text + geospatial indexes |
| V8 | `add_guide_purchase_and_timing_support` | Timing fields, purchase-related guide columns |
| V9 | `add_purchases_and_discounts` | `purchases` table (originally with stripe column names), discount fields on `guides` |
| V10 | `rename_stripe_to_unipay` | Renamed `stripe_checkout_session_id` → `unipay_order_id`, `stripe_payment_intent_id` → `unipay_transaction_id` |

---

## UniPay Integration

**Provider:** UniPay — Georgian PSP, redirect-based hosted checkout.
**No SDK** — uses Spring `RestTemplate`.

```
UniPayService
  createOrder(guideId, title, amountCents, currency, buyerEmail, metadata)
    → POST https://checkout.unipay.com/api/v3/orders
    → returns { checkoutUrl, orderId }

  verifyWebhookSignature(payload, signature)
    → HMAC-SHA256(secretKey, payload) == signature
```

**Webhook:** `POST /api/webhooks/unipay` with `X-UniPay-Signature` header.
**Successful status values:** `COMPLETED` or `SUCCESS` in payload `status` field.
**Config:**
```yaml
unipay:
  merchant-id: ${UNIPAY_MERCHANT_ID:test_merchant}
  secret-key: ${UNIPAY_SECRET_KEY:test_secret}
  api-base-url: ${UNIPAY_API_BASE_URL:https://checkout.unipay.com}
```

---

## Non-Negotiable Rules

1. **No forking** — no guide cloning, forking, merging, or fork-based monetization
2. Buyers purchase a **guide version**, not a subscription
3. Access locked to **exact purchased version** purchased at time of payment
4. Preview shows **only title, day count, place count** — no itinerary details
5. Any user can create/sell — **no approval gate**
6. Payment access **only after webhook confirmation** (never on redirect alone)
7. All business thresholds **configurable** via env vars
8. All secrets in **env vars or secret manager** — never in source
9. Database migrations via **Flyway** — never manual DDL
10. No audio in v1, notifications app-only
11. Stories are **guide promotions** — always linked to a guide, never standalone
12. **Commercial places** (restaurants etc.) require creator-side paid inclusion
13. Guide structure is **Guide → Day → Block → Place** — always
14. Rankings are **regional**, purchases weighted 2× over followers
15. Deleted guides **remain accessible** to past purchasers
16. **UniPay** (Georgian PSP) for payments — redirect-based hosted checkout, REST API, HMAC-SHA256 webhook verification

---

## Product Decisions (confirmed)

- **Map discovery:** Creator pins on map; top 3 in region get 10% larger icons; clicking shows top guide + "see more" link
- **Multi-city guides:** Appear only in their primary region on map
- **Discounts:** Creator sets manual sale price + optional end date (no promotion system)
- **Onboarding:** Profile basics → interests → region → optional upcoming trip → optional pinned location → suggested creators to follow
- **Feed:** Stories are guide promotions (cover image + creator identity); clicking opens guide preview
- **Rankings formula:** `score = followers + (purchases × 2) + verification_bonus`
- **Place images:** Max 4 per place
- **Preview rule:** Strict — no itinerary structure, no place names, no timing before purchase

---

## Design Language

Instagram-inspired dark mode UI + Google Maps utility patterns.

- **Mode:** Dark mode default (`class="dark"` on `<html>`)
- **Dark palette:** `#000000` primary bg · `#121212` secondary · `#262626` elevated/cards · `#363636` borders
- **Light text:** `#F5F5F5` primary · `#A8A8A8` secondary · `#737373` tertiary
- **Brand:** Warm coral `#E8634A` (identity, not UI action color)
- **Accent:** Golden amber `#F5A623`
- **Action blue:** `#0095F6` (primary buttons, follow, CTAs)
- **Typography:** System font stack (`-apple-system, BlinkMacSystemFont, Segoe UI, Roboto`), 14px base, weights 400 + 600 only
- **Border radius:** 8px buttons/inputs · 12px cards · 100px pills
- **Story ring gradient:** `#f9ce34` → `#ee2a7b` → `#6228d7`
- **CSS variables:** `--bg-primary`, `--text-primary`, etc. in `globals.css`, consumed via `ig-*` Tailwind colors
- Map UI: clean, functional, Google Maps density
- Profile: social/Instagram layout with guide grid instead of photo grid

---

## Key Commands

```bash
# Local full stack
cd infra && docker compose -f docker-compose.local.yml up

# Backend build
cd backend && ./gradlew :app:bootJar

# Backend run
cd backend && ./gradlew :app:bootRun

# Backend tests
cd backend && ./gradlew test

# Web dev
cd web && npm run dev

# Web build/lint
cd web && npm run lint && npm run build
```

**Note:** Backend is pinned to JDK 21. If IDE uses a newer JVM, change IDE Gradle runtime to JDK 21.

---

## Config & Environment

All config via environment variables. Full list in `infra/.env.example`.
Business constants with defaults: `com.brooks.common.util.BusinessConstants`.

Key env vars:
```
DB_URL, DB_USERNAME, DB_PASSWORD
AUTH0_DOMAIN, AUTH0_AUDIENCE, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_SECRET
GCP_PROJECT_ID, GCS_BUCKET, GCS_CREDENTIALS_JSON
GOOGLE_MAPS_API_KEY
UNIPAY_MERCHANT_ID, UNIPAY_SECRET_KEY, UNIPAY_API_BASE_URL
MAPBOX_PUBLIC_TOKEN, MAPBOX_STYLE
MAP_DEFAULT_LAT, MAP_DEFAULT_LNG, MAP_DEFAULT_ZOOM
APP_BASE_URL, FRONTEND_BASE_URL, CORS_ALLOWED_ORIGINS
PLATFORM_FEE_PERCENT (default 10)
PLACE_IMAGE_MAX_COUNT (default 4)
PAYOUT_SCHEDULE_CRON, RANKING_REFRESH_CRON
SEED_EXAMPLE_* (example creator seed data)
```

---

## Known Caveats / Tech Debt

- `GET /api/feed` returns a list, not a paginated envelope
- `POST /api/auth/callback` returns `200 OK` (should be `201 Created`)
- Backend tests effectively absent — Gradle test task passes with `NO-SOURCE`
- Redis is provisioned in infra but not used in application logic yet
- Mobile app (`mobile/`) is reserved workspace only — not runnable

---

## File Guide

```
backend/                      Spring Boot modular monolith
  app/src/main/resources/
    db/migration/             Flyway migrations V1–V10
    application.yml           All app config
  purchase/                   UniPay checkout + webhook module
  guide/                      Guide authoring + publishing
  search/                     Full-text search + rankings
  social/                     Follows + stories + feed
web/src/app/                  Next.js App Router routes
infra/
  docker-compose.local.yml    Local dev stack
  .env.example                All env var reference
  .env                        Local secrets (gitignored)
AUTH0_SETUP.md                Auth0 setup checklist
AUTH0_FLOW_EXPLAINED.md       Auth flow explanation
PROJECT_ALTERNATIVE.md        Full product specification (source of truth for product rules)
PROJECT_DOCUMENTATION.md      Implementation status document
```


┌───────────────────────────────────────────────┐
│ [IMAGE]   MuseumsQuartier Wien       📍 4     │
│           Art center • Museums • +2           │ 
│                                               │
│           One of the largest cultural...      │
│                                               │
└───────────────────────────────────────────────┘