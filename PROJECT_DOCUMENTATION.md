# Brooks - Product and Implementation Documentation

> **Last updated:** 2026-04-06
> **Version:** 0.1.0
> **Document mode:** Target product first, with current implementation status called out explicitly

---

## 1. Project Overview

Brooks is a **travel-guide marketplace** with social discovery and creator commerce.

### Target product

Users should be able to:

- discover travel guides by creator, region, destination, and interests
- follow creators and watch **guide-promotion stories**
- buy a specific published guide version
- open purchased guides as structured itineraries
- export plans into map/calendar flows later in the roadmap
- create and sell guides without an approval gate

### Current implementation status

- Backend foundation is real: auth, users, profiles, follows, stories, feed, guide authoring, publishing, and guide preview APIs exist.
- Web guide authoring is real: guide list, new guide, edit guide, and partial guide view routes exist.
- Several frontend routes are still placeholder shells:
  - feed
  - own profile
  - profile edit/onboarding
  - creator profile
  - search/discovery
- Mobile is **not started in runnable form**.

---

## 2. Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Java 21 + Spring Boot 3.3.5 |
| Build | Gradle Kotlin DSL |
| Database | PostgreSQL 16 |
| Migrations | Flyway |
| Frontend | Next.js 14 App Router + TypeScript |
| Styling | Tailwind CSS |
| Auth | Auth0 (`@auth0/nextjs-auth0` on web, Spring OAuth2 Resource Server on backend) |
| Infra | Docker Compose + Caddy |
| Deployment target | GCP VM |

### Current implementation status

- Redis is provisioned in infra but not used in application logic yet.
- CI currently covers backend/web only. Mobile CI has been removed until a real mobile app exists.

---

## 3. Architecture

Brooks is a **modular monolith**:

- one Spring Boot backend
- one Next.js web frontend
- one PostgreSQL database
- Docker/Caddy for local and VM deployment

### Backend modules

- `common`: base entity, pagination, shared exceptions/constants
- `auth`: resource-server security and Auth0 JWT handling
- `user`: user creation and auth callback
- `profile`: creator/user profile data
- `social`: follows, stories, feed
- `guide`: guides, days, blocks, places, versions, publishing
- `app`: bootstrap, config, migrations

### Current implementation status

- The guide module is already part of the live backend and should no longer be considered “next” or “not built”.

---

## 4. Product Model

### Guide model

Brooks guide structure is always:

`Guide -> Day -> Block -> Place`

Each published guide is a sellable product. Buyers purchase a **specific guide version**, not a subscription.

### Stories

### Target product

Stories are **guide promotions**, not generic social posts:

- always tied to a guide
- visually driven by the guide cover + creator identity
- should open the related guide preview/view

### Current implementation status

- Backend story creation now requires a guide reference and stores a promotion against a published owned guide.
- The database still uses the existing `guide_stories` table and legacy fields (`image_url`, `caption`, `link_guide_id`) for compatibility.
- Frontend story UI now renders stories as guide promotions, but the broader feed page is still placeholder-level and does not fetch live data yet.

### Discovery

### Target product

- search by city/region/creator/interests
- rankings by region
- map-based creator discovery

### Current implementation status

- Search/rankings/map discovery are not implemented in the web app yet.

---

## 5. Backend Status

### Implemented

- Auth0 JWT validation and route protection
- first-login user creation through `/api/auth/callback`
- profile create/read/update backend flow
- follow/unfollow/status backend flow
- story creation, deletion, creator story lists, story feed strips
- feed API based on followed creators’ stories
- guide CRUD
- day/block/place CRUD
- guide publishing
- guide preview endpoint
- guide version snapshots persisted on publish

### Important current caveats

- `GET /api/feed` returns a **list**, not a paginated response envelope.
- `POST /api/auth/callback` currently returns `200 OK`, not `201 Created`.
- Backend tests are effectively absent right now; the Gradle test task passes with `NO-SOURCE`.

---

## 6. Database Schema

### Core implemented tables

- `users`
- `user_profiles`
- `follows`
- `guide_stories`
- `guides`
- `guide_tags`
- `guide_days`
- `guide_blocks`
- `guide_places`
- `guide_place_images`
- `guide_versions`

### Current implementation status

- Earlier documentation that described only four tables is obsolete.
- Guide-related persistence is already part of the schema and migrations.

---

## 7. Web Frontend Status

### Working or partially working routes

- `/` landing page
- `/login`
- Auth0 callback/token routes
- `/guides`
- `/guides/new`
- `/guides/[id]/edit`
- `/guides/[id]/view` (partial)

### Placeholder routes

These routes intentionally display “partial / not fully implemented” messaging:

- `/feed`
- `/profile`
- `/profile/edit`
- `/search`
- `/creators/[username]`

### Current implementation status

- The goal is to keep incomplete pages visible without pretending they are production-ready.
- Disabled or placeholder controls should not simulate successful backend actions.

---

## 8. Authentication Flow

### Current implementation

- Next.js uses `@auth0/nextjs-auth0`
- browser session is handled by the Next.js server
- backend validates Auth0-issued bearer JWTs
- token retrieval route exists at `/api/auth/token`

### Notes

- This project uses a **Regular Web Application** Auth0 setup, not a browser-only SPA flow.

---

## 9. Infrastructure and CI/CD

### Current implementation

- Local dev stack uses `infra/docker-compose.local.yml`
- Services:
  - backend
  - web
  - postgres
  - redis
- CI:
  - backend Gradle build/test task
  - web lint/build
- deploy workflow targets a GCP VM

### Current implementation status

- Mobile CI has been removed because the mobile app structure does not exist yet.
- Redis exists only as infrastructure provisioning right now.

---

## 10. Business Rules

### Non-negotiable product rules

1. No forking/cloning/merge monetization model in v1
2. Buyers purchase exact guide versions
3. Preview must not expose full itinerary structure
4. Any user can create/sell guides
5. Stories are guide promotions, not random posts
6. Commercial place handling remains a creator-commerce rule
7. UniPay (Georgian PSP) for v1; PayPal later
8. Audio is not in v1

### Current implementation status

- Story behavior is now aligned at the contract level with guide promotions.
- Commerce, purchases, rankings, reviews, moderation, and map discovery remain roadmap items.

---

## 11. Roadmap

### Already implemented enough to count as started

- Foundation
- Social backend basics
- Guide authoring backend
- Guide authoring web editor

### Still incomplete or upcoming

- live social feed UI
- live profile pages
- discovery/search/rankings/map
- commerce and purchase access control
- calendar/map export utility
- reviews/notifications
- moderation/admin
- mobile app

---

## 12. How to Run

### Local full stack

```bash
cd infra
docker compose -f docker-compose.local.yml up
```

### Backend only

```bash
cd backend
./gradlew :app:bootRun
```

### Web only

```bash
cd web
npm run dev
```

### Validation

```bash
cd backend && ./gradlew test
cd web && npm run lint && npm run build
```

### Notes

- The backend is pinned to **JDK 21** through Gradle configuration.
- If an IDE runs Gradle with a newer JVM and reports class-version errors, the IDE Gradle runtime must be changed to JDK 21.

---

## 13. File Guide

### Main areas

- `backend/` - Spring Boot modular monolith
- `web/` - Next.js web application
- `infra/` - Docker/Caddy/local infra
- `AUTH0_SETUP.md` - Auth0 setup checklist
- `AUTH0_FLOW_EXPLAINED.md` - Auth flow explanation

### Current implementation status

- `mobile/` is not a runnable application yet and should be treated as reserved future workspace only.
