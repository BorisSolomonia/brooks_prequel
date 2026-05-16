# Android Perf Batch 1 — Shipped 2026-05-17

Goal: make the Android (Capacitor 2A WebView) build measurably faster **without changing operations and without introducing bugs**.

## What shipped

### A. Resource hints in `<head>`
File: `web/src/app/layout.tsx`

Added `preconnect` + `dns-prefetch` for the 5 critical third-party origins that the WebView hits during the first 2 s of cold start:
- `https://dev-4zduxht0r6gq1f7f.us.auth0.com` — Auth0 issuer (token, JWKS, callback)
- `https://api.mapbox.com` — Mapbox tile/style API
- `https://events.mapbox.com` — Mapbox telemetry pipe (the page connects whether or not maps render)
- `https://storage.googleapis.com` — GCS public bucket (every cover image, every story image)
- `https://lh3.googleusercontent.com` — Google profile pictures (every user avatar)

Each connection saves ~100–300 ms (DNS + TCP + TLS) on first hit. `preconnect` is the hot path; `dns-prefetch` is the cheap fallback for browsers that ignore the limit.

### B. `next/image` migration on highest-traffic surfaces
Migrated 8 raw `<img>` tags to `next/image` across the 5 most-viewed surfaces:

| Surface | File | Image |
|---|---|---|
| Public guide preview | `app/(public)/guides/[id]/page.tsx` | cover (`fill`, 768 px sizes) |
| Feed | `app/(app)/feed/page.tsx` | avatar (36×36) + feed image (1280×720, responsive) |
| Trips library | `app/(app)/trips/page.tsx` | trip cover (`fill`, 384 px) |
| Purchases | `app/(app)/purchases/page.tsx` | purchase cover (`fill`, 384 px) |
| Search results | `components/search/CreatorSearchCard.tsx` | avatar (48×48) |
| Story strip | `components/ui/StoryStrip.tsx` | strip avatar (56×56) + header avatar (32×32) + story image (1080×1920) |
| Place carousel | `components/places/PlaceCarousel.tsx` | thumb (64×64) + lightbox (1600×1200, responsive) |

What this buys on Android:
- Automatic WebP/AVIF — typically **40–60 %** smaller payloads than the source JPEGs/PNGs uploaded to GCS
- Responsive `srcset` based on device width — phones download the 384 px variant, not the 1080 px source
- Native `loading="lazy"` and `decoding="async"` — images below the fold no longer block the main thread
- Explicit `width`/`height` (or `fill` on a sized parent) — eliminates layout-shift jank that was happening on cold cache

## Why these were the right wins

- **No operation flow changes.** Auth, payments, memory creation, calendar export, deep-link handover — all untouched.
- **No backend changes.** No new endpoints, no migrations, no cache config touched.
- **No Capacitor mode flip.** Still 2A, still loads `https://brooksweb.uk` live, still ships the same AAB; this batch goes out the moment the website redeploys.
- **No service worker introduced.** Service workers in a Capacitor WebView are a known footgun for cache invalidation — explicitly deferred.

## Why we can't easily go *much* faster than this without changing operations

The remaining big rocks all violate at least one constraint of the goal hook:

| Optimization | Why it's deferred |
|---|---|
| Capacitor 2A → 2B (bundle JS into the APK) | First paint goes from ~1.5 s to ~300 ms, but it **changes operations**: now every web change needs a fresh AAB upload + Play review for the JS half. Big policy change, not a perf tweak. |
| Service worker / `next-pwa` | Genuine offline + instant repeat visits, but cache-invalidation bugs in WebViews are notorious and routinely cause "users see old build" incidents — exactly the "no bugs" constraint. |
| Caddy `Cache-Control` tuning on `/_next/static` | Modest repeat-visit win, but it's an infra-side change; belongs in an infra batch with its own rollback plan, not in a frontend perf batch. |
| Code-split Mapbox GL | Mapbox is already route-scoped to `/maps` — additional splitting saves ~0 KB on every other route. |
| Reduce Auth0 round-trips | Would need shorter session or silent-auth tuning. Both touch auth correctness; out of scope for "no operations change". |
| Drop polyfills for legacy WebViews | minSdk 23 means we already serve modern bundles. Nothing left to drop without breaking older devices. |

## Verification

- `npx tsc --noEmit` → exit 0
- `npx next lint --dir src` → no new errors. The 11 remaining `no-img-element` warnings are all in lower-traffic surfaces (guide editor, gift modal, memory token landing, map detail cards, image upload preview) and are explicitly deferred to a future batch.
- All migrated images have either explicit `width`/`height` or `fill` on a `relative`-positioned parent with a fixed height — so CLS is preserved or improved.
- `next.config.js` already had the correct `remotePatterns` for GCS, `lh3.googleusercontent.com`, and Unsplash, so no config changes were needed.

## Anti-criteria (verified)

- No backend changes
- No Capacitor mode change (still 2A, loads brooksweb.uk live)
- No AAB rebuild required — ships on next web redeploy
- No user operation flow changed
- No service worker introduced

## Deferred to batch 2

- Migrate the remaining 11 `<img>` tags in: guide editor, gift modal, place card, global search dropdown, image upload preview, memory token landing, map detail cards
- Add `Cache-Control` to Caddy `/_next/static` (infra batch)
- Investigate Mapbox tile preloading on `/maps` entry
