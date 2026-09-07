# Postcard Club App Rollout

## Decision

Use a shared design system plus targeted layout changes, not a second app or a
global recoloring hack. Light uses warm paper and plum, dark uses charcoal and
rose, and dim uses cool paper. Framed discovery cards carry the strongest postcard
treatment; maps, forms and admin tables remain compact and restrained.

Compared approaches:

| Approach | Stress case | Decision |
| --- | --- | --- |
| Global color overrides only | Inline styles, card structure and navigation remain inconsistent | Insufficient |
| Rewrite every page independently | Duplicated controls and behavior drift, especially purchase and map flows | Avoid |
| Semantic tokens, shared primitives, route-specific layouts | Requires checking legacy utility classes and dense/mobile layouts | Selected |

## Architecture

- `web/src/app/tokens.css` owns semantic theme values and compatibility aliases.
- `web/src/app/globals.css` owns shared Postcard classes and existing map containment rules.
- `web/src/components/ui/Postcard.tsx` provides composable controls and surfaces.
- Existing `mw-*`, `ig-*` and Tailwind brand utilities resolve to the same palette.
- Navbar measures its actual header and bottom navigation with ResizeObserver.
- Maps retain the stable `svh` viewport to avoid the earlier resize-loop regression.
- No API contracts, database migrations, authorization rules or payment code change.

## Coverage

| Area | Applied treatment |
| --- | --- |
| Landing | Existing selected composition, now connected to appearance tokens |
| Navigation/search | Shared brand, responsive search row, account menu, measured offsets |
| Explore/search results | Framed guide cards, separate creator links, bookmark control |
| Guide library | Responsive discovery grid, wrapping tabs, framed owned cards |
| Guide creation/detail | Shared forms, headings, surfaces and bottom editor offset |
| Maps/memories | Compact rows, semantic marker colors, keyboard hover parity |
| Profiles/follow lists | Framed profile headers, shared cards and text hierarchy |
| Trips/purchases/gifts | Shared page rhythm, responsive trip columns, semantic actions |
| Settings/account/legal | Shared page typography, controls, surfaces and status colors |
| Admin | Responsive navigation above mobile content, compact desktop sidebar and tables |
| Loading/error/dialog states | Shared palette and existing interaction contracts preserved |

Routes without bespoke layout changes still inherit the shared system. Redirect
routes and API endpoints do not need visual variants.

## Validation

- Production build passed before final regression review; rerun after any changes.
- Automated test: `cd web` then `node --test tests/postcard-theme.test.cjs`.
- Four tests cover normal-text AA contrast for semantic text/actions/status colors
  in all three themes, compiled control variants, and stable map viewport CSS.
- Tests run in GitHub CI before the web build.
- Local browser: Explore checked at 320px and 390px, no horizontal page overflow.
- Light/dark/dim switching, mobile menu and Escape dismissal checked.
- Settings inspected at 320px; landing inspected at 1440px in dim appearance.
- Local guide API was unavailable (`Failed to fetch`). Populated guide cards,
  authenticated maps/trips, editor mutations and admin data were NOT verified end
  to end. The successful build is not a substitute for those acceptance checks.
- Existing lint warnings and local missing-GCS-bucket warning remain separate work.

## Release Acceptance Checklist

- [ ] Check populated Explore/library cards in all themes on production.
- [ ] Save/unsave a guide and verify guide and creator links remain independent.
- [ ] Pan/zoom map, filter guides/memories, hover/focus a nearby row.
- [ ] Open a purchased trip, calendar dialog and mobile itinerary.
- [ ] Create/edit a draft and verify the save bar clears mobile navigation.
- [ ] Check profile/reviews with long names and text.
- [ ] Check admin tables as an administrator on mobile and desktop.
- [ ] Check keyboard navigation and a physical iOS/Android device.

Do not mark these complete based only on screenshots of empty/error states.
