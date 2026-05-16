# Android UX — Batch 1 (May 2026)

Single-session deliverable in service of the multi-session goal "Brooks Android version must have correct UX, shapes in correct locations, behaviors restructured where clearly better."

**Decisions locked at session start:**
- ✅ Keep parchment brand strictly (no MD3 colour overhaul)
- ✅ Adopt Material 3 *patterns/behaviors* (snackbars, bottom sheets, ripple, FAB)
- ✅ Heavy hand — free to swap small-impact behaviors

This is batch 1 of N. Future sessions continue with per-route deep audits.

---

## What this session shipped

### Foundation components (new)

| File | Purpose |
|---|---|
| `web/src/components/ui/Toast.tsx` | Material-style snackbar provider + `useToast()` hook. Auto-dismisses, tap-to-dismiss, info/error/success variants, queued so multiple don't stack. Sits above the bottom-nav with safe-area inset. |
| `web/src/components/ui/ConfirmDialog.tsx` | Bottom-sheet (mobile) / centered card (desktop) confirm dialog + `useConfirm()` hook. Replaces `window.confirm()`. ESC dismisses, tap-backdrop dismisses, focus on Cancel by default for safety. |
| `web/src/app/globals.css` | New `.mw-ripple` utility class — Material ink-ripple effect on press, using brand-500 colour. Pure CSS. |

### Wiring

- `web/src/components/layout/AppShell.tsx` now wraps `<UserProvider>` with `<ToastProvider>` + `<ConfirmProvider>` — every page can call `useToast()` / `useConfirm()` without per-page setup.

### Behavior replacements (11 sites)

Every `window.alert()` and `window.confirm()` call in the codebase replaced with the new components:

| File | Before | After |
|---|---|---|
| `(app)/guides/page.tsx:97` | `window.confirm("Delete X?")` | `useConfirm().confirm({...destructive: true})` |
| `(app)/guides/page.tsx:110` | `alert("Failed to delete")` | `toast.error("Failed to delete")` |
| `(app)/guides/page.tsx:125` | `alert("Failed to prepare")` | `toast.error(...)` |
| `(app)/guides/[id]/view/page.tsx:135` | `alert("Failed save state")` | `toast.error(...)` |
| `(app)/guides/[id]/view/page.tsx:166` | `alert("Failed vote")` | `toast.error(...)` |
| `(public)/creators/[username]/page.tsx:354` | inline `alert(...)` | inline `toast.error(...)` |
| `(public)/creators/[username]/page.tsx:366` | inline `alert(...)` | inline `toast.error(...)` |
| `guide-editor/GuideEditor.tsx:119` | `window.confirm("Delete X?")` | `useConfirm().confirm({...destructive: true})` |
| `reviews/ReviewComposer.tsx:65` | `window.confirm("Delete?")` | `useConfirm().confirm({...destructive: true})` |
| `search/GuideSearchCard.tsx:32` | `alert("Failed save")` | `toast.error(...)` |
| `ui/BuyButton.tsx:68` | `alert("Checkout failed")` | `toast.error("Checkout failed")` |

Verified via grep — **zero raw `alert(`, `window.confirm(`, `prompt(` calls remain** in user-facing code (the only matches left are in Toast.tsx + ConfirmDialog.tsx themselves: a defensive fallback in `useConfirm` if called outside the provider).

### Deploy & test

These are **web-only** changes. Capacitor 2A WebView loads brooksweb.uk live → no AAB rebuild needed. Deploy frontend, force-close + reopen Brooks, retest. The user-visible difference:

- Errors now appear as a tasteful parchment-coloured snackbar at the bottom (above the nav) for 4-6 s, instead of a system modal
- Delete actions open a bottom-sheet with a drag-handle, parchment styling, clear "Delete" / "Cancel" buttons (Cancel focused by default), instead of the white-and-blue browser confirm dialog
- Add `mw-ripple` className to any tappable card or button for a subtle ink pulse on press

---

## What's deferred to future batches

Ordered by impact × effort ratio. Each item is bounded enough for a focused session.

### Batch 2 — Material foundation polish (~1 hr)

- [ ] Add `@capacitor/status-bar` and wire StatusBar plugin in `capacitor.config.ts` — colour matches parchment in light mode, dark in dark mode (requires AAB rebuild)
- [ ] FAB component for primary actions on long-list screens (e.g. "Create memory" on /maps, "New guide" on /guides)
- [ ] Action-sheet component for replacing `<select>` dropdowns on mobile (better tap targets, larger fonts)
- [ ] Apply `mw-ripple` className to every tappable card across the codebase (~40 sites — mechanical pass)
- [ ] Skeleton loaders for cards-in-loading states (currently mostly "Loading..." text)

### Batch 3 — Per-route audits (top of the list still standing) (~2 hr)

Routes not yet audited for Android-specific UX:

- [ ] `/(app)/guides/new` — multi-step form; should be a wizard with bottom-fixed Next button on mobile
- [ ] `/(app)/guides/[id]/edit` — guide editor; complex; needs bottom-sheet day panel on mobile
- [ ] `/(app)/profile/edit` — form layout for mobile
- [ ] `/(app)/profile/payout` — financial form; needs strong touch targets + keyboard handling
- [ ] `/(app)/trips/[id]` — trip detail; map + timeline; needs swipe gestures
- [ ] `/(app)/trips/preview` — preview flow
- [ ] `/(app)/notifications` — list view; needs swipe-to-dismiss
- [ ] `/(app)/saved` — list view
- [ ] `/(app)/feed` — feed view; needs pull-to-refresh
- [ ] `/(app)/purchases` — list
- [ ] `/(public)/search/creators`, `.../guides`, `.../places` — search variants
- [ ] `/admin/*` — admin panels (desktop-only — flag in copy on mobile)
- [ ] `/m/[token]` — hidden memory reveal page

### Batch 4 — System integration (~2 hr, AAB rebuild required)

- [ ] **Android predictive back gesture** — handle `BackButton` event from `@capacitor/app`, integrate with React Router so back navigates within app, not exits
- [ ] **Share intents** — `@capacitor/share` is installed but not used; add native share to guide / memory pages
- [ ] **Native camera capture** for memory composer + profile-edit avatar — `@capacitor/camera` plugin (currently uses HTML `<input type="file">`)
- [ ] **Status-bar tint** sync with theme (parchment in light, ink in dark) — needs StatusBar plugin
- [ ] **Splash screen** transitions polished — 1.5 s currently feels long; tighten

### Batch 5 — Component-level audits (~3 hr)

Components not yet audited:

- [ ] `ai/*` panels — AiKeysPanel, BuyerChatPanel, CreatorAiPanel
- [ ] `calendar/AddToCalendarModal` — modal pattern; convert to bottom-sheet on mobile
- [ ] `guide-editor/BlockPanel`, `DayPanel`, `PlaceCard` — editor primitives
- [ ] `guide-editor/GiftGuideModal` — modal → bottom-sheet
- [ ] `landing/FloatingFeatureCard`, `BottomFeatureStrip` — landing decorations (already mobile-safe)
- [ ] `layout/GlobalSearchBar` — search dropdown; touch interactions on mobile
- [ ] `media/ImageUploadField` — file picker UX
- [ ] `onboarding/OnboardingTour` — tour overlay; verify it works with bottom-sheet z-indices
- [ ] `places/PlaceCarousel` — horizontal swipe pattern
- [ ] `reviews/PlaceReviewPanel`, `StarInput`, `StarRating` — touch targets on stars
- [ ] `search/CreatorSearchCard`, `PlaceSearchCard`, `SearchSection`, `SearchSkeleton` — list cards
- [ ] `theme/ThemeToggle` — tap target

### Batch 6 — Heavy lift (defer until baseline is solid) (~6+ hr)

- [ ] Mobile bottom nav: add Maps + Settings to mobile bottom-tabs (currently only Explore + Maps + Guides + Trips + Profile)
- [ ] Pull-to-refresh on list views via a custom hook + visual indicator
- [ ] Swipe-to-dismiss on notification cards, saved items
- [ ] Long-press → action sheet pattern for cards (delete, share, pin)
- [ ] Page-transition animations between routes (Material shared-axis pattern)
- [ ] Optimistic UI for likes, saves, follows (currently waits for server response)
- [ ] Offline awareness — show banner when network drops, queue mutations

---

## Action for you (after deploy)

1. Deploy frontend to brooksweb.uk via your normal pipeline
2. Force-close Brooks on your phone, reopen, force-fetch fresh JS bundle (Settings → Apps → Brooks → Storage → Clear cache, then reopen)
3. Test the alert-replacement behaviour:
   - Try to delete a guide on /guides → bottom-sheet confirm appears (parchment-styled, slides up)
   - Trigger an error (e.g. disconnect wifi then tap a save button) → toast appears at bottom for ~4 s
4. Confirm no UI regressions on desktop / Mac browser

Once that's verified, kick off Batch 2 in the next session — I'll start with the status-bar plugin + FAB component + ripple-class propagation.
