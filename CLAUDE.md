# Brooks - Engineering Context

> Durable repository guidance. Read before changing product behavior or architecture.
> Last verified: 2026-09-05 (BOR-105 architecture and product-quality audit).

## Product

Brooks is a creator-driven travel marketplace and location-memory product. Signed-in users can create, publish, save, buy, gift, and execute structured travel guides. Users can also create location-tied memories with text, image, and audio, then share or reveal them under explicit visibility and proximity rules.

Core journeys:

1. Discover creators, guides, places, and memories through search, feed, profiles, and maps.
2. Save a guide before purchase, or buy a specific published guide version through Bank of Georgia iPay.
3. Turn the purchased version into a trip, schedule its places, and sync with Google Calendar or export ICS.
4. Create and share memories while retaining control over visibility, recipients, reveal state, and deletion.
5. Rate purchased guides, rate eligible creators, review places, and vote on review helpfulness.

## Current Architecture

The backend is a Java 21/Spring Boot 3.3.5 modular monolith. It runs as one process over one PostgreSQL database while enforcing module ownership in code. The frontend is Next.js 14 App Router with TypeScript and Tailwind. The mobile client is a Capacitor 6 shell around the same web application, with native location, camera, notifications, share, and app lifecycle bridges.

```text
backend/    Spring Boot Gradle multi-module application
web/        Next.js web application and Capacitor source
mobile/     Native mobile workspace and generated platform support
infra/      Docker Compose, Caddy, deployment, and runtime configuration
docs/       Operational and product documentation
```

Backend modules:

| Module | Owner responsibility |
| --- | --- |
| `common` | Shared entities, exceptions, pagination, constants, and cross-cutting utilities |
| `auth` | JWT validation, authorization rules, and security configuration |
| `user` | Account lifecycle, onboarding intent, and account deletion |
| `profile` | Private profile management and public creator projections |
| `social` | Follows, feed, and guide-linked stories |
| `guide` | Guide authoring, versions, library, trip materialization, calendar, and reviews |
| `memory` | Memories, grants, reveal state, media metadata, replies, and map projections |
| `search` | Fuzzy search and regional ranking projections |
| `purchase` | BOG iPay checkout, callback verification, refunds, earnings, and audit records |
| `ai` | User-managed encrypted AI keys and streaming guide assistance |
| `notification` | In-app notifications and native device tokens |
| `community` | Moments, place questions, answers, voting, and moderation |
| `app` | Bootstrap, media storage, cache/configuration, migrations, and application wiring |

Module convention: `api -> service -> repository -> domain`, with DTOs at every HTTP boundary. Do not serialize JPA entities directly. Public and private response DTOs must remain separate whenever fields differ.

## Implemented Product Phases

| Phase | Status | Scope |
| --- | --- | --- |
| Foundation | Implemented | Auth0, profiles, Flyway, Docker, Caddy, CI/CD, GCP deployment |
| Social discovery | Implemented | Follows, feed, stories, creator profiles, notifications |
| Guide marketplace | Implemented | CRUD, editor, publishing/versioning, search, save/library, gifts, BOG purchase, earnings |
| Trip execution | Implemented | Purchased trip materialization, scheduling, visited/skipped state, Google Calendar, ICS |
| Trust and quality | Implemented | Guide/creator/place reviews, helpful votes, keyword moderation, admin surfaces |
| Map discovery | Implemented | Leaflet map, Mapbox raster tiles, viewport guide/creator results, filters, layer controls |
| Memories | Implemented | Text/image/audio, visibility, direct grants, proximity reveal, replies, notifications |
| Community presence | Implemented | Right Now, moments, place Q&A, votes, freshness rules |
| Native mobile | Implemented baseline | Capacitor Android/iOS bridges; device testing and store hardening remain ongoing |
| Advanced media and moderation | Planned | Guide video/audio, classifier moderation, richer abuse tooling |

The Flyway history currently spans V1-V69, with intentional gaps preserved. Never rename, reorder, or edit an applied migration. Add a new version instead.

## Important Domain Rules

1. Do not implement guide cloning, forking, merging, or fork-based monetization.
2. A purchase grants access to the exact guide version bought at payment time.
3. Paid access begins only after a verified payment callback and payment-detail validation.
4. Deleted guides remain available to prior purchasers but disappear from sale/discovery.
5. Any signed-in user can create and sell guides; there is no creator approval gate.
6. Stories promote guides and must reference a guide.
7. Guide structure is `Guide -> Day -> Block -> Place`.
8. Business thresholds and integration endpoints belong in configuration, not source literals.
9. User secrets belong in Secret Manager or environment variables. User AI keys and OAuth refresh tokens are encrypted at rest.
10. Public APIs must never expose account email, auth identifiers, onboarding state, private role state, payout data, or exact profile coordinates.
11. Location permission is optional and requested only in the context of a location feature. Push permission is requested only after an explicit user action.
12. Memory visibility, grants, reveal state, and approximate/exact coordinate rules are authorization boundaries, not UI conventions.
13. Uploaded media must pass size, allow-list, and file-signature validation before storage.
14. Reviews are purchase-gated according to their service rules; review text is capped at 250 characters and moderated.

## Payments And Access Records

Provider: Bank of Georgia iPay, hosted redirect checkout, GEL, OAuth2 client credentials.

`purchases` and `guide_purchases` are intentionally different aggregates:

| Table | Meaning |
| --- | --- |
| `purchases` | Financial checkout/payment record owned by the purchase module |
| `guide_purchases` | Guide-version access and trip record owned by the guide module |

`PurchaseCompletedEvent` bridges a completed paid purchase into trip materialization. Gift, free, mock, and creator-copy flows can create `guide_purchases` without a financial `purchases` row. Do not consolidate these tables without a migration and domain redesign.

The BOG callback signature is verified over the raw request body. The service then fetches payment details and verifies status, amount, currency, and order identity before granting access. Never trust the browser redirect as proof of payment.

## Maps, Location, And Mobile

The map uses Leaflet and `leaflet.markercluster` with Mapbox raster tiles. Do not reintroduce `mapbox-gl`: WebGL tile textures previously caused severe Android WebView memory growth. Keep map markers bounded and viewport-driven.

Map layer controls let the user independently show guides/creators and memories. Creator results on the side panel are filtered against the current map viewport. Hovering a creator result highlights its map marker.

Map and proximity requests must:

- clamp and validate coordinates;
- avoid stale-response overwrites after rapid pans;
- cancel obsolete requests where possible;
- cap rendered markers and backend result counts;
- provide list-based alternatives to map-only interactions;
- keep 44px mobile touch targets except where a map-position exception applies.

Native system permission prompts must not run at cold start. Entering/using a location feature is the context for location permission. The notification tray is the context for push opt-in. Existing grants may be checked and registered silently.

## Frontend Design

Preserve the established Muted Warhol / aged-photograph visual language rather than replacing it with generic UI:

- Display typography: Archivo and Bricolage Grotesque.
- Strong ink outlines, warm cream surfaces, muted pink/yellow/teal accents, and deliberate collage geometry.
- Light, dark, and dim themes use shared CSS variables in `web/src/app/globals.css`.
- Mobile uses safe-area insets, static viewport sizing where map/WebView stability requires it, minimum 16px form inputs, and touch-sized controls.
- The landing hero uses the Brooks hero artwork as the primary background with a code/CSS fallback.

Reuse existing components and tokens before adding one-off values. Material navigation, privacy, visibility, payment, or information-architecture changes require an explicit product decision.

## API And Security Standards

- `SecurityConfig` is default-deny; every new route needs an intentional public/authenticated/admin rule.
- Enforce object-level authorization in services or authorization beans, not only by hiding buttons.
- Keep DTOs immutable at HTTP boundaries and avoid lazy JPA collections in responses.
- Shared client requests have finite timeouts. Viewport and search-like requests should support cancellation.
- Limit pagination and map query sizes server-side.
- Preserve CSP, HSTS, `nosniff`, referrer, frame, and Permissions-Policy headers in Caddy.
- Camera and microphone are same-origin only and must still be initiated by a user action.
- Never log tokens, secret values, payment payloads, private coordinates, or full user-generated media.
- Keyword moderation is only a baseline. Classifier-based moderation, appeals, and richer abuse detection remain planned.

## Delivery And Verification

CI workflows live in `.github/workflows/`. Push and deployment behavior is branch-filtered; inspect workflow triggers before assuming Actions will run.

Common commands from the repository root:

```powershell
cd backend
.\gradlew.bat test --no-daemon

cd ..\web
npm run lint
npm run build
npm audit --omit=dev

cd ..\infra
docker compose -f docker-compose.local.yml up --build
```

The backend requires JDK 21. Do not build Gradle with a newer unsupported runtime. Docker Desktop must be running before local Compose commands.

For architecture-wide work, record findings, evidence, changes, residual risks, and validation in `.architecture-audit/`. The current BOR-105 record is `.architecture-audit/REPORT-2026-09-05.md`.

## Known Residual Work

- `MapsExperience.tsx` remains a large mixed-responsibility component and should be decomposed incrementally behind behavior-preserving tests.
- Frontend automated component/E2E coverage is still insufficient.
- Global endpoint rate limiting and sensitive-flow throttling need a dedicated design.
- Account deletion confirmation email and the scheduled hard-delete lifecycle are incomplete.
- Google OAuth revocation on calendar disconnect/deletion is incomplete.
- Native attestation for presence-only community writes is not cryptographic yet.
- CSP still requires `unsafe-inline` for Next.js hydration until nonce middleware is implemented.
- Media objects are publicly addressable; private/signed delivery is needed if private media confidentiality becomes a requirement.
- Guide video/audio and classifier-based moderation are not implemented.

## Source Of Truth

- Product decisions: `PROJECT_ALTERNATIVE.md` and current Linear issues.
- Operational config: `infra/.env.example`, Compose files, and deployment workflows.
- Payment integration: `docs/BOG_IPAY_INTEGRATION.md`.
- Database truth: Flyway migrations under `backend/app/src/main/resources/db/migration/`.
- Current architecture evidence: `.architecture-audit/REPORT-2026-09-05.md` and newer reports.

If documentation conflicts with running code, verify the code and migration history, fix the stale documentation, and record material product ambiguity before changing behavior.
