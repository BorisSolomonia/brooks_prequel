# Brooks design research and architecture recheck

Date: 2026-09-05

## Scope and evidence

This is a review of the current Brooks repository and public landing page, plus five isolated HTML prototypes in this directory. It is not a claim that the production app has been redesigned.

The public landing page at `brooksweb.uk` was visually checked at desktop size. Its call to action and lower feature strip currently compete in the same fixed-height hero on some viewports. `/maps` redirects to authentication, so authenticated map screens were not visually tested in this review.

`@DesignerDepot` on X could not be loaded because X returned a 403/response-code failure. The account identity is linked from a Webdesigner Depot article, so its current publisher articles were reviewed as a substitute; this is not equivalent to reading its X feed.

## Ten contemporary visual approaches relevant to Brooks

| Approach | Why it is relevant | Brooks adoption |
| --- | --- | --- |
| Semantic cartography | Google Maps’ color work distinguishes land, water, roads, parks, and labels before product markers. | Keep maps quiet; reserve Brooks pink for selections, saved states, and memories. |
| Dimensional travel marketplace | Airbnb’s 2025 release combines hosts, cards, map context, and high-quality imagery. | Let guide/creator cards carry identity while the map remains a navigation layer. |
| Bounded translucent controls | Apple’s Liquid Glass guidance uses depth in navigation/controls and respects reduced transparency. | Use glass only for a floating search or map toolbar, never as a backdrop for dense information. |
| Expressive hierarchy | Material 3 Expressive uses typography, color, and shape to make primary actions immediately visible. | Use a small semantic token set, not one-off hard-coded page colors. |
| Personal travel journal | Polarsteps makes places and memories feel authored and temporal. | Give memories a quiet narrative treatment, with privacy state more prominent than decoration. |
| Outdoor route utility | Komoot presents routes and collections as practical decisions. | Field Notes is the planning-led interpretation: scans well on mobile and during a trip. |
| Activity-card discovery | AllTrails uses recognisable cards, filters, and clear environmental signals. | Make guide cards compact, filterable, and explicit about duration, area, and difficulty/pace. |
| Map plus itinerary | Wanderlog makes list and map views complement one another. | Keep the left-panel map list as the authoritative selection surface; map pins mirror it. |
| Commerce scan patterns | GetYourGuide uses direct pricing and clear purchase paths around experiences. | Make price, save, eligibility, and purchase state unambiguous without inventing social proof. |
| Functional retro identity | Webdesigner Depot’s recent editorial notes argue for familiar controls and predictable hierarchy, even when a visual identity is playful. | Retain the Muted Warhol personality in imagery or a single signature accent, not in every control. |

Primary references: [Google Maps color system](https://design.google/library/exploring-color-google-maps), [Airbnb 2025 Summer Release](https://news.airbnb.com/airbnb-2025-summer-release/), [Apple Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/), [Material 3 Expressive](https://m3.material.io/blog/building-with-m3-expressive), [Polarsteps](https://www.polarsteps.com/), [Komoot](https://www.komoot.com/), [AllTrails](https://www.alltrails.com/), [Wanderlog](https://wanderlog.com/), [GetYourGuide](https://www.getyourguide.com/), and [Webdesigner Depot’s functional-retro perspective](https://webdesignerdepot.com/why-your-favorite-websites-look-like-2005-and-why-you-secretly-love-it/).

## Recommended direction

**Atlas Studio** is the recommended starting point. It combines the semantic calm of a map product with enough editorial character to keep Brooks from looking like a generic booking interface. Its system is practical to implement from existing components: `GlobalSearchBar`, `GuideCard`, `Avatar`, MapsExperience left-panel rows, and current light/dark/dim themes.

Proposed implementation order after approval:

1. Add semantic design tokens and type scale while preserving the existing three appearance modes.
2. Restructure the shared header/search and guide-card primitives first, with visual regression checks.
3. Apply the map panel, layer controls, marker focus state, and compact creator guide rows to `/maps`.
4. Apply guide, creator, saved/purchased, review, memory, and trip layouts using the same primitives.
5. Replace hard-coded page-specific colors gradually; maintain keyboard, reduced-motion, reduced-transparency, and mobile behaviour.

## Architecture recheck

The codebase is still best treated as a Java 21/Spring Boot modular monolith with a Next.js 14/React 18 frontend. A visual redesign does not justify a move to microservices. The strongest first boundary is a frontend design-token and component layer, with backend contract work only where a UI exposes a real product gap.

### Findings to address before or alongside broad UI rollout

1. **Authenticated location disclosure and relevance mismatch.** `UserProfileRepository` returns `user_profiles.latitude` and `longitude` for the influencer map query. The associated guide is the creator’s latest published guide, not necessarily a guide in the active map area. Return coarse, guide-derived areas (or explicit creator-consented locations) and query guides within the map bounds instead. Do not expose stored profile coordinates to ordinary authenticated users.

2. **API deadline does not cover response-body parsing.** In `web/src/lib/api.ts`, the request timeout and caller abort listener are cleared after `fetch` resolves headers, before `response.json()` is awaited. A stalled body may wait indefinitely. Keep the deadline active through body consumption, propagate an `AbortSignal` across all fetch helpers, and include timeout policy in GET deduplication keys.

3. **Memory fetch abort can suppress a valid retry.** In `MapsExperience`, the bounds key is marked fetched before the request completes. A bounds change aborts the in-flight request; returning to the same quantized bounds can then skip a retry. Mark the key only on a successful, current request and clear it on abort/failure. Also gate response application on both request sequence and `signal.aborted`.

4. **Memory cache may cross account boundaries.** The module-level memory cache is not keyed by authenticated user. A client-side account switch could temporarily render another account’s cached memory metadata. Scope cache entries by user identity and clear them on logout/account change.

5. **Native push listener lifecycle is race-prone.** `PermissionsBootstrap` registers listeners after awaited calls, but unmount cleanup can happen during those awaits. Collect and remove late listener handles if cancellation has occurred; move logging behind development-only controls and do not log notification payloads/tokens.

6. **Local storage failure can break push bootstrapping.** `pushPermission.ts` assumes `localStorage` availability. Wrap access in safe helpers so privacy mode/security policy failures do not interrupt permissions or notification setup.

7. **Landing hero has competing fixed layers.** The page uses a fixed, `dvh` hero and an absolute bottom strip. At the visual test size, the primary CTA overlaps the lower strip. Prefer normal document flow for the lower section or reserve its exact height within the hero.

8. **Design-token divergence.** Shared globals use parchment/terracotta semantics, the landing page uses hard-coded yellow/pink/black and Anton, and shared headings use different type stacks. Preserve the brand identity but consolidate page-level colors and typography into semantic variables.

9. **MapsExperience is an oversized responsibility centre.** It combines data acquisition, map lifecycle, marker rendering, panel behaviour, layers, and interaction state. Split it incrementally into query hooks, marker/layer adapters, and presentational panels, protected by interaction tests before any large move.

## Preview validation

All previews were checked at 1440x1000 and 390x844. Discovery, map, guide, creator, and trip screens reported no horizontal overflow and no failed images. These checks confirm the prototypes, not production accessibility or real API integration.
