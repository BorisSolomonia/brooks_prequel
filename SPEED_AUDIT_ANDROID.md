# Android Web/PWA Speed Audit

Date: 2026-05-21  
Target: Brooks Android Chrome / installed PWA experience  
Priority pages: landing page `/`, map page `/map`  
Audit type: static architecture audit plus runtime-test plan

## Executive Summary

The highest-risk performance areas are:

1. Landing page LCP: full-viewport hero image, Google font, heavy absolute layout, and potentially late background discovery.
2. Map page INP/FPS: map engine, repeated viewport API calls, marker rendering, auth/API failures, and long `requestAnimationFrame` work.
3. Global startup cost: client-side auth/currency work in layout, app-wide JavaScript hydration, and broad use of client components.
4. Backend/API latency: `/api/memories/map`, `/api/maps/influencers`, `/api/exchange-rates`, media endpoints, and error retries can turn frontend startup into repeated failed work.
5. Asset policy: remote Unsplash images, large local hero art, map tiles, Google font, and unoptimized image variants can dominate Android startup on mobile networks.

Runtime note: local shell execution failed before PowerShell startup in this audit turn, so Lighthouse, bundle analyzer, and live trace numbers were not collected. The findings below are source/architecture findings from the inspected code and production console evidence already provided in this thread. The first follow-up task should run the measurement commands listed at the end.

## Core Web Vitals Status

| Metric | Current value | Rating | Likely root cause |
|---|---:|---|---|
| LCP | Not measured | Unknown, high risk | Landing hero image/font/render path |
| CLS | Not measured | Medium risk | Responsive absolute cards, font swap, image dimensions |
| INP | Not measured | High risk on map | Map render loop, marker updates, API retries, main-thread work |
| FCP | Not measured | Medium risk | Google font, hydration, CSS/JS bundle |
| TTFB | Not measured | Medium risk | Next SSR/auth/currency/API proxy path, backend health under errors |

## Priority Findings With 5-Step Deep Dives

### 1. Landing hero image can become the LCP bottleneck

- Area: `web/src/app/page.tsx`, `public/images/brooks-hero-bg.webp`
- Impact: LCP, FCP, perceived startup
- Severity: Critical

Five-level root cause:

1. Symptom: Android first load shows delayed or swapped landing background.
2. Immediate cause: the largest above-the-fold visual is a full-screen hero image.
3. Source-level cause: hero display depends on Next/Image/background loading order and responsive positioning.
4. Architectural cause: the landing page is visually image-first, but the LCP image is treated as page content rather than a hard critical asset with explicit preloading, stable dimensions, and mobile-specific source sizing.
5. Prevention: maintain a performance budget for hero assets and require every first-viewport image to define preload/fetch priority, dimensions/aspect, responsive source, and cache policy.

Recommended fix:

- Keep the correct hero image as the only initial background.
- Use `next/image` with `priority`, `fetchPriority="high"`, `sizes="100vw"`, and stable fill container.
- Add a smaller mobile-optimized hero variant, cropped toward the right.
- Ensure no CSS fallback/background image is visible before the WebP.
- Set long cache headers for `/images/brooks-hero-bg.webp`.

Expected impact: high LCP improvement on Android.

### 2. Google font can delay or shift the landing headline

- Area: `web/src/app/page.tsx`, `next/font/google`, `Anton`
- Impact: FCP, LCP text render, CLS
- Severity: High

Five-level root cause:

1. Symptom: headline may render late or shift when the font becomes available.
2. Immediate cause: `Anton` is a remote Google font dependency.
3. Source-level cause: hero headline uses the custom font above the fold.
4. Architectural cause: branding depends on a web font before the page has established stable first paint.
5. Prevention: critical font policy should define `display`, preload behavior, fallback metrics, and a self-host/subset strategy.

Recommended fix:

- Confirm `next/font` output uses preloaded local font files and `font-display`.
- If CLS appears, set fallback metrics or use a closer fallback.
- Consider self-hosting/subsetting only the used weight and latin subset.

Expected impact: medium to high on FCP/CLS.

### 3. Landing page absolute cards risk unnecessary layout and paint work

- Area: `web/src/app/page.tsx`, `FloatingFeatureCard`
- Impact: CLS, paint cost, mobile memory
- Severity: Medium

Five-level root cause:

1. Symptom: floating cards are visually adjusted often and can overlap or cover the hero.
2. Immediate cause: several absolutely positioned cards use clamp-based `top/right/width` and rotations.
3. Source-level cause: card positions are inline styles in the page component, not governed by a stable layout model.
4. Architectural cause: visual composition is hand-positioned without a responsive layout contract or screenshot regression checks.
5. Prevention: use a constrained composition grid with defined safe zones and viewport-specific coordinates.

Recommended fix:

- Keep desktop floating-card layer hidden on mobile as it is now.
- Add stable `contain: layout paint` or isolate the card layer.
- Replace repeated inline position values with named constants and mobile/desktop safe-zone comments.
- Add Playwright screenshot checks for common Android viewport sizes.

Expected impact: medium CLS/paint stability improvement.

### 4. Landing page mixes large visual work with client-side rendering

- Area: landing page component tree
- Impact: FCP, hydration, INP
- Severity: High

Five-level root cause:

1. Symptom: landing page is the first user impression and must feel instant on Android.
2. Immediate cause: page has multiple custom SVG icons, inline style objects, Next Image, font, and responsive layers.
3. Source-level cause: page is a component-heavy layout even though most content is static.
4. Architectural cause: static marketing content and app shell concerns are not strongly separated.
5. Prevention: keep the landing route mostly server-rendered/static, with no unnecessary client state.

Recommended fix:

- Verify `page.tsx` remains a server component.
- Keep `FloatingFeatureCard` free of client hooks.
- Avoid adding client interactivity to landing unless necessary.
- Prefer CSS classes over many inline style objects if repeated.

Expected impact: medium.

### 5. Map library is likely loaded as a large client-side chunk

- Area: `/map`, map component, MapLibre/Mapbox script evidence from console
- Impact: JS size, FCP, INP, memory
- Severity: Critical

Five-level root cause:

1. Symptom: map page logs long `requestAnimationFrame` work and feels slow on Android.
2. Immediate cause: WebGL map engine initializes, loads style/tiles, and renders every frame.
3. Source-level cause: map code likely imports the map library inside a route component loaded for `/map`.
4. Architectural cause: map is a heavy interaction surface without a lightweight loading shell and staged initialization.
5. Prevention: treat the map engine as a route-level lazy asset with a strict performance budget.

Recommended fix:

- Dynamically import the map component with `ssr: false`.
- Show a lightweight skeleton before importing the map engine.
- Defer non-critical layers, controls, and overlays until after first map idle.
- Avoid importing map code anywhere outside `/map`.

Expected impact: high for map startup and app bundle isolation.

### 6. Map viewport API calls can flood backend and UI

- Area: `/api/memories/map`, map move handlers
- Impact: INP, network, battery, backend load
- Severity: Critical

Five-level root cause:

1. Symptom: repeated `/api/memories/map?...` calls appear in production console.
2. Immediate cause: map viewport changes trigger repeated fetches.
3. Source-level cause: bounds are requested on map movement and errors repeat.
4. Architectural cause: map data fetch is coupled directly to high-frequency UI movement.
5. Prevention: all map viewport APIs need debounce, cancellation, cache keys, and retry policy.

Recommended fix:

- Fetch pins only on `moveend` or with a 300-500ms debounce.
- Abort prior request when a newer viewport request starts.
- Quantize bounds or tile the query so small pans reuse cache.
- Do not retry 500s in a tight visual loop.

Expected impact: high INP/network improvement.

### 7. Map backend 500s create frontend performance degradation

- Area: `/api/memories/map`, backend memory route mapping
- Impact: INP, error rendering, repeated network work
- Severity: Critical

Five-level root cause:

1. Symptom: console shows `Memory map pins are unavailable` and repeated 500 errors.
2. Immediate cause: frontend keeps trying a failing data source.
3. Source-level cause: backend previously returned `NoResourceFoundException` for `/api/memories/map`, indicating route/controller or deployment mismatch.
4. Architectural cause: frontend map does not degrade into a stable disabled state when a required API is missing/failing.
5. Prevention: API route contracts need smoke tests and frontend error circuit breakers.

Recommended fix:

- Add backend integration test for `GET /api/memories/map`.
- Add frontend circuit breaker: after first 500, stop automatic fetches until user taps retry or viewport changes meaningfully.
- Cache last successful pins.

Expected impact: high.

### 8. Map marker rendering can overload Android main thread

- Area: map pins, influencer pins, memory pins
- Impact: INP, frame rate, battery
- Severity: High

Five-level root cause:

1. Symptom: Android map interactions feel slower than simple pages.
2. Immediate cause: many markers/layers can trigger DOM or WebGL work on every pan/zoom.
3. Source-level cause: marker rendering may use per-pin React/DOM markers or frequent source resets.
4. Architectural cause: map data rendering strategy is not separated into viewport clustering and detail-on-demand.
5. Prevention: enforce clustering and source diffing for any map page.

Recommended fix:

- Cluster memory pins server-side or via map source clustering.
- Prefer GeoJSON source/layers over many DOM markers.
- Update source data only when changed, not on every render.
- Memoize marker payloads.

Expected impact: high.

### 9. Auth token resolution can block or duplicate page work

- Area: `useAccessToken`, Auth0 routes, pages using protected APIs
- Impact: startup requests, FCP, INP
- Severity: High

Five-level root cause:

1. Symptom: app pages often wait for auth state before rendering useful UI.
2. Immediate cause: token hook must call/resolve Auth0 session before protected requests.
3. Source-level cause: shared pages like `/m/[token]` and map call APIs after token logic.
4. Architectural cause: auth state is a global runtime dependency for pages that could render partial public shells first.
5. Prevention: route-level data should be split into public shell, optional private data, and authenticated actions.

Recommended fix:

- Render public shells immediately.
- Lazy-load authenticated panels/actions.
- Batch token requests and avoid repeated token calls per component.

Expected impact: medium.

### 10. Exchange-rate request produces unnecessary startup errors

- Area: `/api/exchange-rates?currency=GEL`, middleware/layout
- Impact: startup network, console noise, retry risk
- Severity: Medium

Five-level root cause:

1. Symptom: production console showed `401 Unauthorized` for exchange rates.
2. Immediate cause: client calls currency endpoint even when it cannot authorize or no longer needs multi-currency.
3. Source-level cause: currency code remains in layout/app startup while middleware pins display currency to GEL.
4. Architectural cause: old multi-currency behavior was not fully removed from all clients.
5. Prevention: feature removal checklist should include startup network audit.

Recommended fix:

- Remove client exchange-rate fetch if prices are pinned to GEL.
- If kept, make it public/cacheable and fail silently without blocking UI.

Expected impact: low to medium startup cleanup.

### 11. Remote images are not fully controlled

- Area: guide seeds, user avatars, Unsplash URLs, `next.config.js`
- Impact: image load, LCP on guide/detail pages
- Severity: Medium

Five-level root cause:

1. Symptom: guide and creator images can load inconsistently on Android networks.
2. Immediate cause: many seed images are remote Unsplash URLs.
3. Source-level cause: remote assets depend on third-party response/caching and may bypass Next image optimization if rendered with raw `img`.
4. Architectural cause: content images are not normalized into a first-party media pipeline.
5. Prevention: all public guide images should be uploaded, transformed, cached, and served from first-party storage/CDN.

Recommended fix:

- Replace raw remote images with optimized Next Image where possible.
- Add necessary remote patterns only for domains actually used.
- Move core seed/test images to first-party static or GCS-backed media with known dimensions.

Expected impact: medium.

### 12. Missing image dimensions can cause layout shifts

- Area: shared memory page raw `<img>`, avatar images, media images
- Impact: CLS
- Severity: Medium

Five-level root cause:

1. Symptom: media-heavy pages can shift when images load.
2. Immediate cause: raw images do not always have intrinsic width/height or aspect-ratio boxes.
3. Source-level cause: shared memory media uses `<img>` with class sizing but no explicit dimensions.
4. Architectural cause: media rendering is generic and does not require stored dimensions.
5. Prevention: media upload pipeline should persist dimensions and render aspect boxes.

Recommended fix:

- Add fixed aspect containers for user-generated images.
- Store media width/height on upload.
- Render Next/Image or CSS `aspect-ratio` placeholders.

Expected impact: medium CLS improvement.

### 13. Shared memory geolocation flow can become an INP hotspot

- Area: `web/src/app/m/[token]/page.tsx`
- Impact: INP, user-perceived responsiveness
- Severity: Medium

Five-level root cause:

1. Symptom: reveal action may feel slow or fail in in-app browsers.
2. Immediate cause: geolocation high accuracy request waits up to 10 seconds.
3. Source-level cause: the button triggers GPS and API reveal in one interaction.
4. Architectural cause: location permission, location acquisition, and reveal API are combined in a single UX step.
5. Prevention: separate permission readiness, browser compatibility gate, and reveal action telemetry.

Recommended fix:

- Keep Messenger gate.
- Add progress states for permission, locating, and verifying.
- Consider `maximumAge` first with a short cached attempt, then high-accuracy retry.

Expected impact: low to medium.

### 14. Backend map query likely needs spatial indexing and bounds limits

- Area: memory service/repository, `/api/memories/map`
- Impact: TTFB, map responsiveness
- Severity: High

Five-level root cause:

1. Symptom: viewport requests can be slow or fail as memory data grows.
2. Immediate cause: bounds queries search by latitude/longitude.
3. Source-level cause: no confirmed spatial/geospatial index from inspected migrations.
4. Architectural cause: map API is a spatial workload but may use ordinary relational filters.
5. Prevention: every map table should have a bounding-box index strategy and payload cap.

Recommended fix:

- Add composite indexes on latitude/longitude visibility fields or PostGIS if available.
- Enforce max viewport size and max result count.
- Return simplified pin DTO only.

Expected impact: high map TTFB improvement.

### 15. API payloads may overfetch for map and guide cards

- Area: guide list/search/map endpoints
- Impact: network, JSON parse, memory
- Severity: Medium

Five-level root cause:

1. Symptom: Android CPU and network cost rises with route data size.
2. Immediate cause: APIs can return more fields than first paint needs.
3. Source-level cause: guide response DTOs include nested days/blocks/places for full guide views.
4. Architectural cause: list/card/map DTOs and full-detail DTOs must remain strictly separate.
5. Prevention: enforce endpoint-specific DTO budgets.

Recommended fix:

- Ensure map endpoints return only pin id, coordinates, type, and small label/media.
- Ensure guide list routes never include full itinerary.
- Compress JSON and cache public lists.

Expected impact: medium.

### 16. Spring Boot cold start and health dependency can delay deploy/runtime recovery

- Area: backend app, Flyway, JPA validation, Docker health checks
- Impact: availability, first response after deploy
- Severity: Medium

Five-level root cause:

1. Symptom: previous logs showed backend unhealthy due migration/schema validation.
2. Immediate cause: backend cannot serve until Flyway/JPA validation completes.
3. Source-level cause: migration history drift and missing columns blocked startup.
4. Architectural cause: deployment health depends on database migration consistency.
5. Prevention: CI must run migration validation against a clean database and an upgraded database.

Recommended fix:

- Add CI job that starts Postgres, runs app migrations, and validates JPA schema.
- Add smoke endpoint tests for map and purchase flows.

Expected impact: operational performance and reliability.

### 17. Free test guide seed can grow migration cost

- Area: `V35__seed_free_test_creator_guides.sql`
- Impact: deploy migration time
- Severity: Low

Five-level root cause:

1. Symptom: seed migration is large and JSON-heavy.
2. Immediate cause: guide snapshots are built in SQL.
3. Source-level cause: two complete guides are inserted with nested JSON aggregation.
4. Architectural cause: realistic test content is stored as production migration data.
5. Prevention: separate production-critical migrations from large optional demo/test seed packs when the dataset grows.

Recommended fix:

- Keep current two-guide seed acceptable.
- If seed content grows, move demo packs behind an environment-controlled seed runner or dev-only migration profile.

Expected impact: low now, preventive later.

### 18. Caddy/Next caching policy needs explicit asset tuning

- Area: `infra/Caddyfile.prod`, Next static assets, public images
- Impact: repeat loads, LCP, bandwidth
- Severity: Medium

Five-level root cause:

1. Symptom: repeat Android visits may still refetch heavy assets if headers are weak.
2. Immediate cause: Caddy config sets security headers but not explicit cache rules for public images.
3. Source-level cause: static files rely on default upstream/Next behavior.
4. Architectural cause: CDN/cache policy is not treated as part of frontend performance.
5. Prevention: define cache headers for immutable Next assets and versioned public assets.

Recommended fix:

- Add long cache for `/_next/static/*`.
- Add long cache for versioned images.
- Use short/no-cache only for HTML and API.

Expected impact: medium for repeat visits.

## File/Subsystem Coverage Notes

The audit scope is all git-tracked files. Based on inspected repo structure, the important performance surfaces are:

| Subsystem | Speed relevance | Audit conclusion |
|---|---|---|
| `web/src/app/page.tsx` | Landing LCP/FCP/CLS | Critical first-page target |
| `web/src/components/landing/*` | Landing paint/layout | Keep static and server-rendered |
| `web/src/app/map` or map route files | Map INP/FPS | Critical map target |
| `web/src/app/m/[token]/page.tsx` | Geolocation/reveal INP | Medium; gate is correct |
| `web/src/lib/api` | Request behavior | Needs abort/retry/cache audit |
| `web/src/hooks/useAccessToken` | Auth startup | Avoid duplicate token work |
| `web/next.config.js` | Image/bundle policy | Remote images/cache policy needs review |
| `backend/memory` | Map pins/API | Critical API/DB target |
| `backend/guide` | Guide detail/purchase flow | DTO and snapshot size target |
| `backend/app/resources/db/migration` | DB schema/indexes | Need map indexes and migration CI |
| `infra/Caddyfile.prod` | Cache/security headers | Add explicit static cache rules |
| Docker/GitHub Actions | deploy speed/reliability | Add clean/upgrade migration tests |

## Measurement Commands To Run When Shell Works

```powershell
cd C:\Users\Boris\Dell\Projects\APPS\Brooks_prequel\web
npm run build
npx next build --profile
npx lighthouse http://localhost:3000 --preset=desktop --output=json --output-path=..\reports\lighthouse-home-desktop.json
npx lighthouse http://localhost:3000 --emulated-form-factor=mobile --throttling-method=simulate --output=json --output-path=..\reports\lighthouse-home-mobile.json
npx lighthouse http://localhost:3000/map --emulated-form-factor=mobile --throttling-method=simulate --output=json --output-path=..\reports\lighthouse-map-mobile.json
```

```powershell
cd C:\Users\Boris\Dell\Projects\APPS\Brooks_prequel\backend
$env:GRADLE_USER_HOME=(Resolve-Path '.\.gradle').Path
.\gradlew.bat :app:bootJar --no-daemon
```

Map profiling to capture manually on Android Chrome:

- Record `/map` load.
- Pan/zoom for 20 seconds.
- Capture Network and Performance tabs.
- Export trace.
- Check long tasks over 50ms, JS heap growth, FPS drops, and repeated API calls.

## Prioritized Fix Roadmap

1. Fix landing hero LCP: preload/priority/responsive mobile image/cache.
2. Lazy-load map engine and defer non-critical map layers.
3. Debounce/cancel/cache `/api/memories/map` viewport fetches.
4. Add backend map route integration tests and frontend circuit breaker for 500s.
5. Remove or neutralize unnecessary startup exchange-rate fetch.
6. Add static asset cache headers in Caddy.
7. Add image dimensions/aspect placeholders for user media.
8. Add map DB indexes and payload caps.
9. Add Android Lighthouse/trace CI or release checklist.

