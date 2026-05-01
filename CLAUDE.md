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
| Payments | Bank of Georgia iPay — redirect-based hosted checkout, OAuth2 REST API, GEL only. See `docs/BOG_IPAY_INTEGRATION.md` |
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
| POST | `/api/purchases/checkout` | purchase | Create BOG iPay order, return approveUrl |
| GET | `/api/purchases/my` | purchase | Buyer's purchase history |
| POST | `/api/webhooks/bog-ipay` | purchase | BOG iPay callback (verified via Payment Details API) |

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

### ✅ Phase 6 — Purchases & Payments (Bank of Georgia iPay)
- `PurchaseService` — creates BOG iPay order, saves `bog_order_id` and `bog_payment_hash`
- `BogIpayClient` — `createOrder()`, `getPaymentDetails()`, `refund()`, OAuth2 token cache
- `WebhookController` — `POST /api/webhooks/bog-ipay`, verifies via Payment Details API (BOG callbacks are unsigned), marks purchase COMPLETED
- `PurchaseRepository` — `findByBogOrderId()`
- Idempotent webhook handling via atomic SQL update
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
| V10 | `rename_stripe_to_unipay` | (Historical) Renamed Stripe columns. Superseded by V32. |
| V32 | `bog_ipay_purchase_columns` | Renames legacy payment columns to BOG-shaped (`bog_order_id`, `bog_payment_hash`, `bog_ipay_payment_id`, `bog_transaction_id`). Idempotent. |
| V33 | `purchases_gel_default_and_wipe` | Wipes purchases + creator_earnings, sets currency default to GEL |

---

## Bank of Georgia iPay Integration

**Provider:** Bank of Georgia iPay — Georgian PSP, OAuth2 REST API, redirect-based hosted checkout. **GEL only.**
**No SDK** — uses Spring `RestTemplate`. Full integration guide at `docs/BOG_IPAY_INTEGRATION.md`.

```
BogIpayClient
  createOrder(shopOrderId, amountMinorUnits, description, productId)
    → POST https://ipay.ge/opay/api/v1/checkout/orders
    → returns { orderId, paymentHash, approveUrl }

  getPaymentDetails(orderId)
    → GET https://ipay.ge/opay/api/v1/checkout/payment/{order_id}
    → returns { status, paymentHash, ipayPaymentId, transactionId, ... }

  refund(orderId, amountMinorUnits)  // null amount = full refund
    → POST https://ipay.ge/opay/api/v1/checkout/refund (form-urlencoded)

  ensureToken()  // OAuth2 client_credentials, cached until 60s before expiry
    → POST https://ipay.ge/opay/api/v1/oauth2/token
```

**Callback:** `POST /api/webhooks/bog-ipay` (form-urlencoded). **No signature mechanism documented by BOG** — verification is done by re-fetching `getPaymentDetails(orderId)` and comparing `payment_hash` against the stored value.
**Successful status:** `success` in Payment Details response.
**Config:**
```yaml
bog-ipay:
  client-id: ${BOG_IPAY_CLIENT_ID}
  secret-key: ${BOG_IPAY_SECRET_KEY}
  base-url: ${BOG_IPAY_BASE_URL:https://ipay.ge/opay/api/v1}
  callback-path: ${BOG_IPAY_CALLBACK_PATH:/api/webhooks/bog-ipay}
  locale: ${BOG_IPAY_LOCALE:ka}
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
16. **Bank of Georgia iPay** for payments — redirect-based hosted checkout, OAuth2 REST API, GEL only, callback verified via Payment Details API

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
BOG_IPAY_CLIENT_ID, BOG_IPAY_SECRET_KEY, BOG_IPAY_BASE_URL
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
    db/migration/             Flyway migrations V1–V33
    application.yml           All app config
  purchase/                   BOG iPay checkout + callback module
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