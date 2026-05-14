# Brooks_prequel — iPhone smoke-test plan

Run on your physical iPhone in **Mobile Safari** (not Chrome iOS — that's still WebKit but has different chrome). Target site: `https://brooksweb.uk`. Test in **both portrait and landscape**, **both light and dark mode** (Settings → Display & Brightness → Dark).

Each step has an expected result. If anything fails, note the step number and screenshot — I'll fix it.

---

## Pre-flight

- [ ] iOS version is ≥ 16 (for `dvh` + viewport-fit support)
- [ ] Hard-refresh Safari: settings → Safari → Clear History and Website Data
- [ ] Pull-to-refresh once on brooksweb.uk to ensure latest cache

---

## Cross-cutting checks (any page)

1. **Safari address bar tint** — open any page. The address bar should pick up the parchment colour `#F1E4D1` in light mode, `#0E0E0E` in dark mode. **Fail:** plain grey/white.
2. **No notch overlap** — content does not slide under the iPhone notch / Dynamic Island when scrolling. Top of every page is below the status bar.
3. **No home-indicator overlap** — the bottom strip with the home indicator does not cover tappable buttons. Add `pb-` is visible.
4. **URL-bar collapse does not cause page jump** — scroll down 50 px; address bar shrinks; page content should NOT slide up by 100 px.
5. **Landscape orientation** — rotate to landscape. No content under the side notches; no horizontal scroll; nav links stay readable.
6. **Form fields don't auto-zoom** — tap any input on `/search`, `/account/delete`, `/contact`. Page does NOT zoom in. Cursor appears at the same scale.
7. **No tap-highlight blue flash** — tapping any link should not show the default iOS blue tap-overlay.
8. **Pull-to-refresh does NOT expose white** — pull down at the top of any non-map page; no white rubber-band shows behind the parchment background.

---

## Route 1 — `/` (landing)

9. Open `/`. **"BROOKS PREQUEL"** wordmark sits below the iPhone status bar — not behind the Dynamic Island.
10. On iPhone X+ portrait, the mobile hero text "**Every place could be hiding something**" is fully visible without scrolling.
11. **"Get started" button** is at least the width of your fingertip; tapping it navigates to `/api/auth/login`.
12. Rotate to landscape on iPhone Pro Max — left margin moves to clear the side notch; no text gets cut off.

---

## Route 2 — `/maps`

13. Sign in (necessary for `/maps`). Load `/maps`.
14. The bottom panel's bottom edge sits **above** the home indicator strip.
15. Tap **"Create hidden memory"**. The form opens. Confirm that:
    - Eyebrow "New memory" and "0/500" appear on one line.
    - Textarea visible.
    - Location indicator line under it.
    - Place + Visibility on one row (2-col grid).
    - Photo + Audio + Record on one row (3-col grid).
    - **"Save and share" button is fully visible without scrolling**.
16. Tap the textarea. iPhone keyboard appears; the save button remains reachable (Safari pushes content up; or the form is short enough to fit).
17. Tap "Close memory creator" — panel returns to default height.

---

## Route 3 — `/(public)/guides/[id]` (any guide detail)

18. Browse to a paid guide. **Buy** CTA button visible at the bottom of the card area without overlapping the bottom mobile nav.
19. Tap the **terms checkbox** — the checkbox state toggles. Labels also work as tap targets.
20. Tap **"Privacy Policy"** inline link — opens `/privacy` in a new tab. No iOS auto-detection treating prices as phone numbers (price strings like "₾79.99" should be plain text, not tap-to-call links).
21. If Google Pay is enabled (only after `NEXT_PUBLIC_GOOGLE_PAY_ENABLED=true` is set), the Google Pay button renders above the Buy CTA.

---

## Route 4 — `/(auth)/login`

22. Open `/login` (or sign out and reopen). The card is vertically centred and **fully visible** on iPhone SE 1st gen height (568 px). No content cut off top or bottom.
23. **"Sign in with Email"** and **"Continue with Google"** buttons are at least 44 pt tall. Tappable without misfires.
24. Tap "Continue with Google" — opens Auth0 flow. In Mobile Safari, this works normally (in Capacitor it would route through a Custom Tab — out of scope today).

---

## Route 5 — `/(public)/search`

25. Open `/search`. Search input at top is visible and doesn't trigger zoom when tapped.
26. Type a query; results appear; cards are tappable without zooming.
27. Sticky search header doesn't slide under the iPhone notch when scrolling results.

---

## Route 6 — Account deletion

28. Open `/account/delete` (public — works without login). Page fills viewport; form is centred.
29. Type into the email input — no iOS zoom.
30. Tap "Email me a deletion link" — should submit to `/api/account/delete-request`. Network request returns 200.
31. Open `/settings/account/delete` (signed-in only). Reason textarea + confirm-phrase input + Delete button all visible.
32. The destructive **"Delete my account permanently"** button is in brand colour; clearly distinguishable from secondary actions; large enough to tap deliberately.

---

## Visual regression spot-checks (light + dark)

33. Top sticky navbar: parchment in light, dark surface in dark. Border bottom visible.
34. Bottom mobile nav: same — readable both modes, tab labels visible.
35. Landing page hero contrast: text legible against the warm hero background in both modes.

---

## What to report back

For each failing step, send me:
- Step number (e.g. "Step 18 fails")
- iPhone model + iOS version
- One screenshot
- One sentence of context

I'll fix and ship a patch. Items that pass: just confirm the count (e.g. "30/35 pass, 5 to review").
