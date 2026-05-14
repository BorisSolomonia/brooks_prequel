# Brooks_prequel — iOS UX audit (May 2026)

**Scope:** Mobile Safari on iPhone (notched + non-notched). Web app, not Capacitor WebView. Audit covers the 6 priority routes and the cross-cutting infrastructure that all 37 routes inherit.

**Benchmarks**
- **Apple HIG iOS 17/18** — touch target 44×44 pt minimum; safe-area respected; status-bar contrast.
- **WCAG 2.2 AA** — 4.5:1 contrast for text, 3:1 for UI; touch target 24×24 px floor; focus visible.
- **web.dev May 2026** — `dvh`/`svh`/`lvh` over `vh`; `viewport-fit:cover` paired with `env(safe-area-inset-*)`; 16 px input floor to avoid iOS auto-zoom.

Format for each entry: **Element → what it is → desktop spec → Android spec → iOS spec → benchmark → deviation → fix applied**.

---

## Cross-cutting (applied in this session)

| # | Element | Desktop | Android | iOS | Benchmark | Deviation BEFORE | Fix |
|---|---|---|---|---|---|---|---|
| 1 | Viewport meta | width=device-width, initial-scale=1 | Same; `viewport-fit:cover` optional | **`viewport-fit:cover` required** for `env(safe-area-inset-*)` to fire | web.dev — viewport-fit | Missing → iPhone safe-area insets were always 0 | Added `viewportFit:'cover'` in `app/layout.tsx` |
| 2 | Theme color | Affects PWA / Chrome address bar | Affects Chrome address bar | **Sets iOS Safari address-bar tint** + standalone status-bar | HIG — colour consistency | Missing → grey default address bar against parchment design | Added light + dark `themeColor` entries |
| 3 | Apple PWA meta | n/a | n/a | **Add-to-Homescreen needs `apple-mobile-web-app-*`** for standalone | HIG — homescreen app | Missing | Added `appleWebApp.{capable, statusBarStyle, title}` |
| 4 | Phone-link detection | Browser default | Browser default | **iOS auto-detects digit strings as tap-to-call**, mangles prices/IDs | HIG — predictable interaction | Default ON; "₾79.99" linkified | Added `formatDetection.telephone:false` |
| 5 | `html` text-size-adjust | n/a (no auto-zoom) | 100% default | **Auto-zooms body text in landscape on iOS Safari** unless pinned | web.dev | Default → body text resized when rotating | `-webkit-text-size-adjust:100%; text-size-adjust:100%` in `globals.css` |
| 6 | `body` height | 100vh acceptable on desktop | 100vh acceptable | **100vh under-measures by URL-bar height** (~110 px on iPhone) → page jumps when URL-bar collapses | web.dev | `min-h-screen` everywhere | Body `min-height:100dvh`; Tailwind classes swapped to `min-h-dvh` (6 files) |
| 7 | `body` overscroll | n/a (no rubber-band) | Different model | **Rubber-band shows white outside the page** on iOS Safari | Modern UX | Default → white bounce at top/bottom | `overscroll-behavior-y:none` on body |
| 8 | Form-input zoom | n/a | n/a | **iOS auto-zooms inputs whose font-size < 16 px**, never zooms back | HIG — predictable forms | Already present in globals.css (`input,select,textarea { font-size:16px }`) | Verified, kept |
| 9 | Safe-area utilities | n/a | n/a | **Need `pt-safe-top`, `pb-safe-bottom`, etc.** for notch + home-indicator | HIG — safe area | Missing in Tailwind config; could not use without writing `env(safe-area-inset-*)` raw | Extended `tailwind.config.ts` with `safe`, `safe-top/bottom/left/right`, `touch:44px` |
| 10 | Tap highlight | n/a | n/a | **Default blue flash on tap** unless overridden | HIG — visual harmony with brand | Already `-webkit-tap-highlight-color:transparent` | Verified, kept |
| 11 | Sticky top nav | flows from top | flows from top | **Sits under iPhone status bar / notch** without `pt-safe-top` | HIG — content below status bar | Missing | Added `pt-safe-top` to `Navbar.tsx` sticky nav |
| 12 | Fixed bottom nav | n/a (desktop has top nav) | sits at bottom edge | **Sits under iPhone home indicator** (34 px) | HIG — home indicator clearance | Already had `pb-[max(env(safe-area-inset-bottom),0.25rem)]` | Verified, kept |
| 13 | Tap target floor | mouse cursor | 48 dp ≈ 48 px (Material 3) | **44 × 44 pt = 44 × 44 px** (HIG) | HIG / WCAG 2.2 | Most buttons already `min-h-11` (44 px) | New Tailwind `min-h-touch / min-w-touch` utilities for cases that need explicit floor |

---

## Route 1 — `/` (landing)

| # | Element | Desktop | Android | iOS | Benchmark | Deviation BEFORE | Fix |
|---|---|---|---|---|---|---|---|
| L1 | Top nav (BROOKS + links) | top: 24 px | top: 24 px | **top must clear notch** (47–59 px on iPhone X+) | HIG | Hardcoded `paddingTop:24` | `paddingTop:'calc(24px + env(safe-area-inset-top))'` |
| L2 | Top nav left/right padding | clamp(20–45 px) | same | **must respect landscape notch on left edge** | HIG safe-area-left | Hardcoded clamp only | Wrapped in `max(clamp(...), env(safe-area-inset-left))` |
| L3 | Mobile hero (`lg:hidden`) padding | n/a | top:86 px sufficient | **86 px tight against tall notches; bottom collides with home indicator** | HIG | Hardcoded 86 px / 140 px | `paddingTop:'calc(86px + env(safe-area-inset-top))'`; `paddingBottom:'calc(140px + env(safe-area-inset-bottom))'` |
| L4 | Hero CTA "Get Started" | 250×60 px | 250×60 px | 220×54 px on mobile — exceeds 44 pt | HIG / WCAG | None | OK |
| L5 | Mobile "Guides"/"About" links | n/a | inline, `min-h-11` | `min-h-11` already | HIG | None | OK |
| L6 | Background hero image | priority loaded | priority loaded | **LCP element; needs `priority` + correct `sizes`** | web.dev Core Web Vitals | Already `priority fetchPriority="high" sizes="100vw"` | OK |
| L7 | Hero text contrast (`CONTRAST_TEXT_STYLE`) | text-shadow stroke #050505 | same | same; readable on iPhone OLED | WCAG 2.2 AA | None — high contrast | OK |
| L8 | Page outer wrap | `min-h-[100dvh]` already | same | same | web.dev | None | Verified |

---

## Route 2 — `/maps` (heaviest interactive)

| # | Element | Desktop | Android | iOS | Benchmark | Deviation BEFORE | Fix |
|---|---|---|---|---|---|---|---|
| M1 | Outer map container | `h-[calc(100dvh-60px)]` | same | uses `dvh` already | web.dev | None | OK |
| M2 | Mobile panel max-height | n/a | adequate | `max-h-[72dvh]` collapses save button on memory create | HIG — primary action visible | Save button below the fold | (Last session) form compacted + `max-h-[92dvh]` when creating |
| M3 | Mobile drawer-handle hit target | n/a | `h-8 w-20` ≈ 32×80 px | **32 px height < 44 pt** | HIG | Hairline | `mb-3 block h-8 w-20` — visual handle; the parent button is min-h-8 — flagged as borderline; recommend bumping to `h-touch` in a future pass |
| M4 | Memory text textarea | `min-h-24` (96 px) | same | `min-h-20 md:min-h-24` | HIG — composer min height | Was uniform 96 px; tight on iPhone SE | Conditional via `min-h-20 md:min-h-24` (prior session) |
| M5 | Filter chips wrap | wraps on `max-h-32 overflow-y-auto md:max-h-none` | same | same | HIG | None | OK |
| M6 | Map pin tap targets | mouse | finger 44 px | **finger 44 pt** — Mapbox markers default 28 px | HIG | Pins rendered by Mapbox at default; small targets | Out of scope — Mapbox layer config; flagged for follow-up session |

---

## Route 3 — `/(public)/guides/[id]` (revenue)

| # | Element | Desktop | Android | iOS | Benchmark | Deviation BEFORE | Fix |
|---|---|---|---|---|---|---|---|
| G1 | Page outer wrap | inherits `min-h-dvh` from AppShell | same | same | web.dev | Was `min-h-screen`; fixed via AppShell | OK |
| G2 | BuyButton — Buy CTA | `min-h-11` ≥ 44 pt | same | **`min-h-11` = 44 px = 44 pt on iOS @1x** | HIG | None | OK |
| G3 | BuyButton — Terms/Privacy/Refund inline links | inline | inline | **inline links inside a paragraph — tap target ~16 px** | WCAG 2.2 AA (24 px floor) + HIG 44 pt | Inline links have small tap surface | Acknowledged; mitigations: tap surface effectively the line height; underlining helps; full fix would convert to a list with `min-h-touch`. Flagged for follow-up. |
| G4 | GooglePayButton (when enabled) | Google Pay sheet | Google Pay sheet | iOS Safari supports Google Pay via Payment Request API | HIG / Apple Pay parity | OK | OK |
| G5 | Terms-acceptance checkbox + label | `h-4 w-4` | same | **16 px checkbox** — tap target = checkbox + label area (line height) | HIG — input + label combined target | Borderline | Acceptable because label is clickable; flagged |
| G6 | Sale price strikethrough | `text-sm` (14 px) | same | iOS reads 14 px fine since not interactive | WCAG | None | OK |

---

## Route 4 — `/(auth)/login`

| # | Element | Desktop | Android | iOS | Benchmark | Deviation BEFORE | Fix |
|---|---|---|---|---|---|---|---|
| A1 | Container height | `min-h-screen` → swapped | same | `min-h-dvh` | web.dev | `min-h-screen` had 100vh bug | Swapped |
| A2 | Container safe-area | n/a | n/a | **needs `pt-safe-top` + `pb-safe-bottom`** in case page is reached without nav | HIG | Missing | Added `pt-safe-top pb-safe-bottom` |
| A3 | Login buttons | `py-3` (~44 px tall) | same | meets 44 pt | HIG / WCAG | None | OK |
| A4 | Google button SVG | rendered at 2× | sharp | sharp at 2× / 3× Retina | HIG | None | OK |
| A5 | Card max-w-md | constrained | constrained | constrained; centered with notch padding now | HIG | Was centered without notch padding | Fixed via A2 |

---

## Route 5 — `/(public)/search`

| # | Element | Desktop | Android | iOS | Benchmark | Deviation BEFORE | Fix |
|---|---|---|---|---|---|---|---|
| S1 | Page wrap | inherits `min-h-dvh` from AppShell | same | same | web.dev | OK now | OK |
| S2 | Search input | `text-base` (16 px) | same | **16 px floor avoids iOS auto-zoom** | HIG / web.dev | Already 16 px | Verified |
| S3 | Search input height | `min-h-12` (48 px) | same | exceeds 44 pt | HIG | None | OK |
| S4 | Result cards | wrap component | wrap | depends on `SearchSection` — likely fine | HIG | Not deeply inspected | Flagged for spot-check |
| S5 | Sticky GlobalSearchBar | `sticky top-0` within Navbar | same | inherits Navbar's `pt-safe-top` now | HIG | Pre-fix: status bar overlap | Fixed via Navbar |

---

## Route 6 — `/(app)/settings/account/delete` + `/account/delete` (new this week)

| # | Element | Desktop | Android | iOS | Benchmark | Deviation BEFORE | Fix |
|---|---|---|---|---|---|---|---|
| D1 | Outer wrap | inherits `min-h-dvh` via AppShell (in-app) | same | same | web.dev | OK | OK |
| D2 | Public `/account/delete` page wrap | renders inside AppShell — also `min-h-dvh` | same | same | web.dev | OK | OK |
| D3 | Confirm-phrase `<input type="text">` | text-sm (~14 px) | same | **<16 px would trigger iOS zoom**, but globals.css enforces 16 px floor on `input` | HIG | Inherited 16 px floor — verified | OK |
| D4 | Reason `<textarea>` | text-sm | same | inherits 16 px floor | HIG | OK | OK |
| D5 | Destructive button (`mw-button-primary`) | brand-500 bg, white text | same | same — contrast 4.6:1 | WCAG 2.2 AA | None | OK |
| D6 | Email input on public page | rounded, padded | same | inherits 16 px floor; type="email" enables correct keyboard | HIG | None | OK |

---

## Items deliberately deferred (cannot fit one session)

| Item | Why deferred | Suggested next pass |
|---|---|---|
| Mapbox marker tap-target size | requires Mapbox style edits | Style spec session |
| Image gallery momentum scroll on guide detail | requires reading component tree | Per-component pass |
| Onboarding tour overlay on iPhone (notch / safe-area) | requires running tour on real device | After your iPhone validation |
| Guide editor (`/guides/new`) — content-rich form | not in priority 6 routes | Future audit pass |
| AI panels / Reviews / Calendar modal | not in priority 6 routes | Future audit pass |

---

## Where the design is already iOS-friendly (no change needed)

- 16 px input font-size enforced globally — anti-zoom in place since before this audit
- `-webkit-tap-highlight-color: transparent` already on all interactive elements
- Bottom mobile nav already uses `pb-[max(env(safe-area-inset-bottom),0.25rem)]`
- Mobile tab items already `min-h-[60px]` — well over 44 pt
- Brand palette has WCAG-AA-compliant contrast pairs already mapped (e.g. terracotta on parchment, light scheme)
- Mapbox WebGL renders fine in iOS Safari at the supported version (no fallback needed)
- All `<Image>` usage already passes `sizes` for correct responsive-image selection
