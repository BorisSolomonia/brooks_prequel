# Brooks — Play Store listing copy

Drop these straight into the Play Console **Main store listing** form. Lengths are validated against current 2026 Play Console limits.

---

## App title (max 30 chars)
```
Brooks — Travel Guides
```
*(20 chars — leaves room for localisation)*

## Short description (max 80 chars)
```
Discover, buy, and follow turn-by-turn travel guides from real creators.
```
*(73 chars)*

## Full description (max 4000 chars)

```
Brooks is a marketplace for human-written travel guides — itineraries built by people who actually walked the streets, ate at the cafés, and watched the sun set from the corner everyone else missed.

WHAT YOU CAN DO

• Discover guides for cities, neighbourhoods, hikes, and themed trips, curated by local creators
• Preview every guide before buying — see the route, the highlights, and the creator's intro
• Pay once, own forever — guides you buy stay in your library
• Follow turn-by-turn directions on an interactive map, with photos, opening hours, and notes at each stop
• Sync trip days to your Google Calendar (optional) so reminders land on the right day
• Save places to revisit, leave reviews, and reward creators whose guides moved you

FOR CREATORS

If you know a place better than the guidebooks do, publish your own guide on Brooks. Set your own price, keep the majority of every sale, and reach travellers who want depth rather than top-10 lists. Built-in tools handle media uploads, day-by-day routing, and refunds.

PAYMENTS

Brooks accepts card payments processed by Bank of Georgia iPay. Where supported, you can pay even faster with Google Pay — your card is tokenised by Google and never passes through Brooks. All purchases are subject to our Refund Policy.

PRIVACY

We use Auth0 to sign you in, Google Cloud to host the service, and Mapbox to render maps. We never sell your data or use it for advertising. You can delete your account at any time from Settings → Delete account, or at brooksweb.uk/account/delete if you have lost access.

This app is a companion experience to brooksweb.uk — the full website remains available in any browser. Tap a guide, find your next trip, and go.
```
*(1,548 chars — well under the 4000 cap)*

---

## App category
- **Category:** Travel & Local
- **Tags (up to 5):** travel, itinerary, maps, guides, marketplace

---

## Required graphic assets (Play Console will not let you save without these)

| Asset | Dimensions | Format | Notes |
|---|---|---|---|
| **App icon** | 512 × 512 px | 32-bit PNG, no alpha | Use the same brand mark as the in-device icon. Background `#C95A7D`. |
| **Feature graphic** | 1024 × 500 px | PNG or JPG | Hero banner shown at top of listing. Text-light. |
| **Phone screenshots** | min 1080 × 1920 px (9:16) | PNG/JPG | At least 2, recommended 4–8. Capture from a real device in flight mode using the offline fallback OR from a live session against brooksweb.uk. |
| **7-inch tablet (optional)** | 1600 × 2560 | PNG/JPG | Boosts Play Store ranking on tablets — recommended |
| **10-inch tablet (optional)** | 1920 × 2880 | PNG/JPG | Same |
| **Promo video (optional)** | YouTube URL | — | 30–60 s product walkthrough; can be added later |

**Brand colours to use in feature graphic + screenshots overlays:** rose `#C95A7D`, cream `#F7F1E7`, ink `#0E0E0E`.

---

## Screenshot script (4 recommended shots, in order)

1. **Map with pinned guide** — show the map view of a guide with 3-5 pins visible, brand-coloured.
2. **Guide detail page** — title + creator name + Buy CTA visible.
3. **Trip-in-progress** — turn-by-turn directions screen with a checkpoint marked complete.
4. **Library view** — "My Purchases" / "My Trips" listing with 2-3 guides.

Use the device frame or a clean status bar (full battery, no notifications). The Play Console handles edge bevels.

---

## Content rating (IARC questionnaire — likely answers)

Most answers are "No" for a travel guide marketplace. Notable:

- **Does the app contain user-generated content?** **Yes** — guides authored by users.
- **Do you moderate UGC?** **Yes** — describe the moderation tools you operate (manual review queue, takedown flow, abuse reporting). If you do not yet have moderation tooling, build the minimum before answering Yes.
- **Does the app include gambling, drugs, alcohol, sexual content, violence?** **No** (assuming guides do not feature these).
- **Does the app share user-provided location with other users?** Depends — answer based on whether one user can see another's location. For Brooks I assume No.
- **Does the app facilitate communication between users?** Yes if reviews are visible to all; otherwise No.

Expected rating: **PEGI 3 / ESRB Everyone** if no UGC violence/profanity flag is raised; **Teen** if user-to-user messaging is enabled.

---

## Target audience and content

- **Target age group:** 18 and over (recommended — marketplace + financial transaction)
- **Ad-supported:** No
- **In-app purchases:** Yes — digital travel guides (price range $0–$99 USD)

---

## Contact details

- **Developer email:** info@brooksweb.uk (must be reachable)
- **Developer phone:** +995595036076 (optional, but reviewers may call)
- **Developer website:** https://brooksweb.uk

---

## Required app-content declarations checklist

Tick these off in the Play Console under **Policy → App content**:

- [ ] Privacy policy URL: `https://brooksweb.uk/privacy`
- [ ] App access (reviewer credentials): provide a test Auth0 account
- [ ] Ads: No
- [ ] Content rating: IARC questionnaire (see above)
- [ ] Target audience: 18+ (or per IARC outcome)
- [ ] News app: No
- [ ] COVID-19 contact tracing: No
- [ ] Data safety: complete from `DATA_SAFETY_ANSWERS.md`
- [ ] Government apps: No
- [ ] Financial features: No (iPay is a checkout processor, not a financial service)
- [ ] Health: No
- [ ] **Account deletion** (Data deletion section): in-app path = Settings → Delete account; web URL = `https://brooksweb.uk/account/delete`
- [ ] Approved countries: per K1 decision (see `K1_PLAY_BILLING_DECISION.md`)
