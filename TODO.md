# Brooks Prequel — TODO

Backlog of fixes, UX corrections, and new features to apply in future sessions.
Recorded 2026-05-05 from a single review pass on `https://brooksweb.uk`.

Status legend: `[ ]` open · `[x]` done · `[~]` partial / in progress

---

## 🐛 Bugs

### B1. Map memory tooltip jumps to top-left on mouse hover

- **Where:** main maps page (`https://brooksweb.uk/maps`)
- **Symptom:** when a memory is added on the map and the user hovers it with the mouse, sometimes the tooltip / popup jumps to the upper-left corner of the screen instead of staying anchored to the marker.
- **Likely files:** `web/src/components/maps/MapsExperience.tsx`
- **Likely cause:** popup/tooltip uses fixed-position coordinates without anchoring to the marker, OR the popup's container is offset by a parent transform/scroll.
- **Acceptance:** hovering any memory marker shows the popup anchored to the marker (or to the cursor) — never at screen 0,0 — and the position is consistent across rapid mouse movements.
- **Status:** [ ]

### B2. Trip map: place markers not visible by default

- **Where:** trip detail page (`/trips/[id]`) — the "Trip map" panel
- **Symptom:** on first render, the map shows no place markers. Markers only appear after the user clicks a category filter tab (e.g. "Activity") and then back to "All".
- **Likely files:** `web/src/components/maps/PurchasedTripMap.tsx`
- **Likely cause:** `useEffect` that creates Mapbox markers depends on `activeCategory` state changes; on initial mount with `'ALL'` the marker-add path may be skipped.
- **Acceptance:** first paint of the trip detail page shows all non-skipped place markers without any user interaction.
- **Status:** [ ]

---

## 📱 Mobile UX corrections

### U1. Place-card layout on `/trips/[id]` (mobile only)

- **Where:** `web/src/app/(app)/trips/[id]/page.tsx` — place card markup (around lines 421–503)
- **Current state on mobile:**
  - Top row: checkmark + place photo + place name (wrapping)
  - Skip button is in the action row but visually wrong position
  - Place description (`placeData.description`) is centered inside the card
- **Wanted:**
  - Skip button moves to the LEFT, beneath the checkmark column (same column as the visited toggle)
  - Place description is left-aligned starting under the checkmark column — not centered, not right-aligned
  - Action row order on mobile, top to bottom in left column: ✅ visited, ⏭ skip
- **Acceptance:** on a 360–430 px phone, the card has a clear left "controls column" (visited + skip stacked) and a right "content column" (photo, name, description, address). Description text is left-aligned within the content column.
- **Status:** [ ]

---

## 🧭 Information architecture / navigation

### N1. Move `/purchases` into the profile section (do NOT delete)

- **Where:**
  - Page files stay at their current paths so the BOG iPay return URL keeps working: `web/src/app/(app)/purchases/page.tsx` and `web/src/app/(app)/purchases/success/page.tsx` remain in place.
  - UI changes: remove `/purchases` from any top-level nav, surface it instead from inside the profile section (e.g. a "Purchases" link in the profile menu / profile sidebar / profile dropdown).
- **Reasoning:** original plan (delete `/purchases`) would break BOG iPay's post-checkout redirect. Keeping the URL but relocating its **discovery** under profile gives the cleaner UX without touching the payment flow.
- **Acceptance:**
  - `https://brooksweb.uk/purchases` and `/purchases/success` continue to load (BOG iPay return path unbroken).
  - No remaining link to `/purchases` exists in the top navbar.
  - The profile section (e.g. `/profile`) has a clear entry point linking to `/purchases`, named e.g. "Purchases" or "Order history".
- **Open question:** in the profile UI, should the link be a sub-page (`/profile/purchases` rendering the same content) or a simple link to the existing `/purchases` route? Sub-page is cleaner IA but requires either route migration or a thin wrapper page.
- **Status:** [ ]

### N2. Rename `/trips` section to "Purchased guides"

- **Where (every text reference):**
  - `web/src/app/(app)/trips/page.tsx` — page heading
  - `web/src/app/(app)/trips/[id]/page.tsx` — back-link text on line 250–251 (currently `← Back to My Trips`)
  - `web/src/components/layout/Navbar.tsx` — nav label
  - any breadcrumbs or sidebar items referring to "Trips" / "My Trips"
- **Note:** keep the URL path `/trips` (changing the URL would break existing links and bookmarks). Only the user-facing label changes.
- **Acceptance:** the words "Trips" and "My Trips" no longer appear in the user-facing UI. All references read "Purchased guides".
- **Status:** [ ]

### N3. Move `/pricing` link from top nav to footer

- **Where:**
  - `web/src/components/layout/Navbar.tsx` — remove Pricing link
  - `web/src/components/layout/Footer.tsx` — add Pricing link
- **Acceptance:** top navigation has no "Pricing" entry; footer has one.
- **Status:** [ ]

### N4. Move `/privacy` link to footer next to `/refund`

- **Where:** `web/src/components/layout/Footer.tsx` (or wherever the legal links live)
- **Acceptance:** the footer shows `Refund` and `Privacy` links adjacent to each other (and `Terms`, `Contact`, `Delivery` if those are also linked there). Order: Terms · Privacy · Refund · Delivery · Contact (or whatever ordering makes sense — agree with Boris).
- **Status:** [ ]

---

## 📝 Content

### C1. Expand `/refund` page with more detail

- **Where:** `web/src/app/refund/page.tsx`
- **Current state:** brief, terms-style page with minimal refund mentions
- **Wanted sections (each as its own `<section>` matching the `/terms` and `/privacy` style):**
  - **Eligibility** — exactly when refunds are granted (digital goods are typically non-refundable; spell out the explicit policy)
  - **How to request** — step-by-step process (e.g., email `info@brooksweb.uk` with order ID and reason)
  - **Timeline** — when buyer can expect a decision (e.g., review within 7 business days) and when funds are returned (e.g., within 14 business days of approval)
  - **Refund method** — back to the original payment method (BOG iPay), store credit, or other options
  - **Exceptions** — what's NOT refundable (e.g., guides whose content has been substantially viewed/downloaded; bundles where one item was used)
  - **Partial refunds** — when applicable (e.g., partial use of a multi-day guide)
  - **Disputes / escalation** — how to escalate if the buyer disagrees with the decision
  - **Contact** — same `compliance.email` + `compliance.supportResponseTime` block as `/privacy`
- **Acceptance:** page covers all the topics above in the same visual style as `/terms` and `/privacy` (which I created earlier this session).
- **Status:** [ ]

---

## ✨ New features.

### F1. Place-level reviews (buyer-only authoring, buyer-only audience)

- **Description:** a buyer (customer who has purchased the guide) can leave a star rating and a written review for any individual place inside that purchased guide. Those reviews are visible **only to other buyers of the same guide** — not to the public, not to non-purchasers.
- **Distinct from** the existing guide-level review (which rates the guide as a whole and may be public).
- **Permission matrix:**
  | Actor | Write own review | Read others' reviews |
  |---|---|---|
  | Buyer of this guide | ✅ | ✅ |
  | Buyer of a different guide | ❌ | ❌ |
  | Signed-in non-buyer | ❌ | ❌ |
  | Public / unsigned visitor | ❌ | ❌ |
- **Backend changes:**
  - **New entity / table:** `place_reviews` with fields:
    - `id` UUID PK
    - `place_id` UUID FK → places
    - `guide_id` UUID FK → guides (denormalised for permission check + simpler queries)
    - `user_id` UUID FK → users
    - `rating` INT (1–5)
    - `review_text` TEXT (nullable)
    - `created_at`, `updated_at` TIMESTAMP
  - **Constraints:** `UNIQUE (place_id, user_id)` so one review per buyer per place; index on `(place_id)` and `(guide_id)` for fast read.
  - **New endpoints (all under `/api/me/...` — auth required):**
    - `POST /api/me/places/{placeId}/review` — create or update. Permission: caller must have an active completed purchase of the place's parent guide.
    - `GET /api/me/places/{placeId}/reviews` — list reviews of this place. Permission: same as POST — caller must own the parent guide.
    - `DELETE /api/me/places/{placeId}/review` — buyer deletes their own review.
  - **Permission rule:** every endpoint validates `purchases` row exists for `(user_id, guide_id, status='completed')`. Reuse the same purchase-validation helper as the existing trip endpoints. **No public read endpoint** — the audience is gated to fellow buyers.
  - **Aggregation (optional):** an aggregate count + average can be exposed on the public guide preview (`GET /api/guides/{id}/preview`) without revealing individual review text — purely as a "X buyers reviewed Y places" signal. Decide later.
- **Frontend changes:**
  - On `/trips/[id]` place card: a small "Rate this place" star input + textarea + submit. After submit, show the user's own review with edit/delete affordance.
  - On the same card: a toggleable "Reviews from other travelers" panel that fetches `GET /api/me/places/{placeId}/reviews` (gated; only renders for buyers).
  - The public guide preview page (`/guides/[id]`) does NOT show place review text — only optional aggregate stats if we add them.
- **Migration:** Flyway `V36__place_reviews.sql` (or next available V).
- **Status:** [ ]

### F2. Up to 5 photos per place — limit must be config-driven everywhere (NO hardcoding)

- **Hard requirement:** the maximum-photos-per-place limit must come **only** from `PLACE_IMAGE_MAX_COUNT` (env / config). It must NOT appear as a hardcoded literal anywhere — no `if (images.length >= 4)`, no `slice(0, 4)`, no `<input multiple max="4">`, no `Array.from({length: 4})`. If we ever raise or lower the limit, the only file that changes is the env value.
- **Audit step (do this first):** grep the entire codebase for hardcoded `4` and `5` near image / photo / place identifiers.
  ```bash
  cd web/src && grep -rnE "(images|photos)\.length\s*[<>=!]+\s*[0-9]+|slice\(0,\s*[0-9]+\)|max.*[0-9]+.*(image|photo)" .
  cd backend && grep -rnE "(images|photos|imageCount).*[0-9]+|MAX.*=.*[0-9]+" --include="*.java"
  ```
  Replace every hardcoded comparison or slice with a read of the config value (`@Value("${app.place.image-max-count}")` on the backend; `process.env.NEXT_PUBLIC_PLACE_IMAGE_MAX_COUNT` or a server-fetched config on the frontend).
- **Where to update the value:**
  - `infra/.env.production.example` — `PLACE_IMAGE_MAX_COUNT=5`
  - `infra/.env.example` — same
  - `infra/docker-compose.local.yml` — same default
  - GCP Secret Manager `brooks-prequel-env` — set to `5`
- **Where to consume the value (no hardcoded numbers!):**
  - **Backend:** `application.yml` already maps env → `app.place.image-max-count` (verify); service that enforces the limit reads it via `@Value`. No literal `4` in any guard.
  - **Frontend uploader:** must read the limit from a config endpoint or a `NEXT_PUBLIC_*` env var. Validation message uses the variable, not a literal: `"Maximum ${MAX} photos per place"`.
  - **Place card display:** map over `images` array directly — never `.slice(0, 5)` with a hardcoded literal. If a UI cap is needed, use the config value.
- **Acceptance:**
  - Repo-wide grep for hardcoded `4` / `5` near image-related code returns zero hits inside guard expressions or render limits.
  - Bumping `PLACE_IMAGE_MAX_COUNT` in env (and only in env) immediately changes the limit everywhere — uploader, validation, display, backend rejection — without touching code.
  - Guide creator UI accepts up to N photos per place (where N = env value); rejects the N+1th with a clear message that uses the env value in its text.
  - Place cards show all uploaded photos (carousel, swipeable on mobile, click-to-zoom on desktop).
  - The first photo remains the "cover" used in trip card thumbnails.
- **Status:** [ ]

### F3. Trip map markers — numbered and interconnected

- **Where:** `web/src/components/maps/PurchasedTripMap.tsx`
- **Current state:** plain markers, no order indication
- **Wanted:**
  - Each marker shows its visit-order number (1, 2, 3, …) — order = the scheduled chronological order of `visibleItems`
  - A polyline connects consecutive markers in that order (showing the planned route)
  - Polyline style: brand-coloured, dashed or solid, ~3 px weight; under the markers in z-order
  - On category filter (Activity, Transport, etc.), the polyline reflects only the filtered subset (or hides — choose one in design)
- **Implementation note:** Mapbox GL has `addLayer({ type: 'line' ... })` with a GeoJSON source. Markers can use a numbered SVG element passed to `new mapboxgl.Marker({ element })`.
- **Acceptance:**
  - Visiting a trip detail page on a freshly-loaded session shows numbered markers and the connecting polyline immediately (also fixes B2)
  - Polyline updates correctly when the user toggles `skipped` or `category` filters
- **Status:** [ ]
- **Related:** B2 (markers-not-visible bug); fixing F3 likely fixes B2 in the same pass.

---

## Suggested ordering

Quick wins first, big features last:

1. **B1** — map memory tooltip (small CSS / positioning fix; investigation needed)
2. **N1** — relocate `/purchases` discovery to profile section (URL preserved for iPay; minutes of nav work)
3. **N2** — rename trips → "Purchased guides" (find-and-replace + nav label)
4. **N3 + N4** — move pricing & privacy to footer (2-3 file edits)
5. **U1** — place card mobile layout (CSS/flex order edits in one file)
6. **C1** — expand `/refund` content (single file rewrite)
7. **B2 + F3 together** — trip map default markers + numbering + polyline (one Mapbox refactor)
8. **F2** — bump place photos to 5 (env + UI changes)
9. **F1** — place-level reviews (largest item: backend + DB + frontend)

---

*Last updated: 2026-05-05*
