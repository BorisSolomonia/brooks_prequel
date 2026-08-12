# Right Now v2 — Place Q&A + Location Stories

**Status:** Design (pre-implementation). Extends BOR-86 "Right Now" v1.
**Author:** Claude_PAI, 2026-08-12. **Owner:** Boris.
**Companion docs:** `BOR86_RIGHT_NOW_DESIGN.md` (v1), this doc's §8 DPIA.

> This document is design + DPIA only. No code ships from it directly. It resolves
> the product shape, the psychology it exploits (ethically), the UX flows, the data
> model, and — critically — the **dormant monetization hooks** so that paying
> answerers and creators later is a *config flip*, not a schema rewrite.

---

## 1. What we are building (and what we are deliberately NOT building yet)

**Now (free, v2):**
1. **Place Q&A.** A user picks a place — *including a place in another city they are
   not near* — and asks a question, either by tapping a **preset** ("How busy?",
   "Open now?", "Weather/queue?") or typing **free text** ("is the terrace covered if
   it rains?"). People **currently at that place** (geo-verified, as in v1) get a
   nudge and can answer/share. Answers are **anonymous**.
2. **Location Stories.** A user physically at a place posts ephemeral photo/video
   "instants" pinned to that place. They live **24h** and are **place-public** — anyone
   viewing that place sees the recent moments. Stories are **identified** (the poster's
   handle shows). This is the "vicarious travel / being there" surface.

**Later (prepared for, NOT built now):**
- **Answerer monetization** — tips/bounties for valuable answers.
- **Creator payout** — high-spectator story creators earn a share of a pool.
- Both reuse Brooks' existing **manual off-system payout ledger** (single platform
  account, bank transfer, no auto-split). v2 only *accrues* attributable value-events;
  disbursement stays manual and human-triggered exactly as it is for guides today.

**The four locked decisions (from Boris, 2026-08-12):**
| # | Decision | Choice |
|---|---|---|
| D-1 | Ask format | Presets **and** free text |
| D-2 | Remote asking | **Yes** — ask about any place, any city |
| D-3 | Stories | Ephemeral 24h, **follower-scoped** (future: tighter "close followers" tier) — REVISED 2026-08-12 from place-public |
| D-4 | Identity | **Split** — answers anonymous, stories identified (to followers) |
| D-5 | Sequencing | **Stories first, Q&A second** (2026-08-12) |
| D-6 | Future payout basis | **Asker-verified helpfulness** (Q&A) + follower-engagement (Stories) — NOT raw public spectator volume (2026-08-12) |

> **Design impact of the D-3 revision (important):** Stories are an audience-scoped,
> location-tagged feed (Instagram-stories model) — NOT a public place rail (Snap-Map
> model). This (a) **removes the public-polling stalking oracle** the RedTeam flagged as
> the top safety risk, (b) shifts "spectators" from the general public to **your
> followers**, so the future creator payout rides on follower reach/engagement, and (c)
> makes Stories lean on Brooks' **existing follower/social graph** — which is why
> shipping Stories FIRST (D-5) is coherent: the social graph already exists.

---

## 2. The psychology — why people will actually love this

Grounded in what made location/presence products loved (and what killed them). Each
principle maps to a concrete UX rule in §4–5.

**2.1 The hooks we are pulling (ethically):**
- **Altruistic reciprocity / local pride.** People answer strangers for free when it's
  low-effort and makes them feel *useful and knowledgeable* (Foursquare tips, Google
  Local Guides, Reddit locals). The motive is status + belonging, not money — which is
  why free works *now* and money is a later amplifier, not the engine.
- **Real-timeness = trust.** "Popular Times → Live" on Google Maps is trusted because
  it's *now*. Recency + presence-proof + corroboration is the entire credibility model.
  An answer's value decays in minutes; the UX must foreground freshness.
- **Curiosity & vicarious presence.** "What's it like *right now* at Fabrika?" is a
  dopamine question. Stories answer it viscerally (Snap Map's Our Story, BeReal's
  authenticity). Travelers especially: it de-risks a plan and scratches wanderlust.
- **FOMO via ephemerality.** 24h expiry makes viewing urgent and posting low-stakes
  (Instagram/Snap stories). Permanence raises the bar to post; ephemerality lowers it —
  more supply, more liveness.
- **Ambient social proof.** Seeing that *others are asking/answering/posting* about a
  place signals "this app is alive here," which is self-reinforcing.
- **Recognition ladder.** A visible "Trusted local / Helpful" status (v1 already has
  TRUSTED tier) gives the intrinsic reward that later becomes the monetization surface.

**2.2 The failure modes we are designing against:**
- **Ghost-town cold start (the #1 killer).** Zenly/most location apps die when the map
  is empty. *Mitigation:* never show a dead feed — see §4.4 (synthetic-but-honest
  signals: Google-style busyness, historical patterns, "be the first" prompts, and
  seeding stories at a few hero places).
- **Creepiness / stalking / safety (what got Zenly shut and Life360 sued in press).**
  *Mitigation:* v1's privacy invariant holds for Q&A (no raw coords stored, anonymous).
  Stories are opt-in, identified, **place-level not precise**, with a delay option and
  no "who's here" people-list. We never expose a person's live position — only a place's
  vibe. See §8 DPIA.
- **Spam / incentive gaming (worsens once money exists).** *Mitigation:* free text is
  rate-limited, present-user-gated for answers, reportable; the value-ledger (§7) is
  built game-resistant from day one even though payout is off.
- **Poster burnout / pressure.** *Mitigation:* ephemerality + anonymity-on-the-ask-side
  keep stakes low; no streaks that punish.

**2.3 The one-sentence product truth:**
> *Right Now sells the feeling of "being there before you're there" — trustworthy
> because it comes from people who are actually there, right now.*

---

## 3. Information architecture

Three surfaces, one place-centric spine:

```
                 ┌─────────────────────────┐
                 │        A PLACE          │  (community_places, v1 gazetteer + city index)
                 │  Fabrika · Tbilisi      │
                 ├─────────────────────────┤
   Q&A  ───────► │  ❓ Questions & Answers  │  anonymous · present-user-answered · decaying
   Live status ► │  📊 Right Now status     │  v1 QUIET/NORMAL/BUSY/CLOSED (unchanged)
   Stories ────► │  🎞️ Moments (24h)        │  identified · place-public · spectator-counted
                 └─────────────────────────┘
```

- **Discovery** gains a **place search** (name + city) so remote asking works (D-2).
  Nearby list from v1 stays as the default/"Around me" tab.
- A **place page** is the unit everything hangs off — this is the key IA change from v1
  (v1 was a nearby-list → feed). v2 is search/nearby → **place page** → 3 sections.

---

## 4. UX — Ask & Answer

### 4.1 Asking (works remotely, D-2)
1. User finds a place via **Around me** or **Search a place / city**.
2. On the place page, taps **Ask**.
3. Compose sheet: a row of **presets** (contextual to category — a cafe shows "Busy?
   / Free tables? / Wi-Fi? / Open?"; an outdoor spot shows "Raining? / Crowded?"),
   plus a **free-text** field with a 140-char cap and a gentle placeholder ("Ask people
   who are there…").
4. Send. The question is **anonymous**. It opens/extends a short **ask window** at that
   place (reuses v1's request/participant model; repeated asks dedupe into one window
   so answerers aren't spammed).
5. Asker gets a push when an answer arrives.

**Psychology applied:** presets = near-zero effort (most asks) + free text = expressive
tail. Anonymity removes social risk from "dumb" questions → more asks → more liveness.

### 4.2 Answering (present users only — v1 invariant preserved)
- People whose device is **geo-verified within the place radius** (v1 transient
  Haversine + dwell, no stored coords) get a **low-friction nudge**: "Someone's asking
  about {place} — you're here. Help out?"
- Answer options mirror the ask: quick **status chips** + a short **free-text reply** +
  optional **attach a moment** (bridges into Stories).
- Answers are **anonymous** but carry earned badges: `TRUSTED local`, `corroborated`,
  freshness ("2 min ago"). These are the trust signals, not a name.
- Asker + others can mark **Helpful** (this is the future-payout signal, §7).

**Psychology applied:** the nudge exploits altruistic reciprocity at the exact moment
of lowest effort (you're already there). Badges give status without identity.

### 4.3 Trust model
An answer's credibility = **presence-proven** (you were there) × **fresh** (minutes) ×
**corroborated** (≥2 agree) × **contributor trust** (v1 tier). Displayed, never hidden.

### 4.4 Anti-ghost-town (critical)
A place page must **never look dead**:
- Show v1 **live status** + **Google-style typical busyness** (historical, honest) even
  with zero live answers.
- If no one's there: "No one's here right now — **ask anyway**, we'll notify you when
  someone arrives" (async ask; push on first answer). This converts empty into a
  *promise* instead of a dead end.
- Seed **hero places** (Fabrika, Rustaveli, a few per launch city) with real moments so
  first-time users see life.

---

## 5. UX — Location Stories ("Moments")

### 5.1 Posting (identified, present-only, D-3/D-4)
1. At a place (geo-verified), tap **Add a Moment**.
2. Capture photo/short video (existing camera plugin) → optional caption → post.
3. **At-capture consent + safety** (see §8): explicit "This will be public on {place}
   for 24h under your name" + a **face/people caution** + optional **15-min delay**
   toggle (reduces real-time stalking risk — you're gone by the time it shows).
4. Moment appears in the place's **Moments** rail for **24h**, then auto-expires.

### 5.2 Viewing (follower-scoped — REVISED D-3)
- A Moment is visible to the poster's **followers**, surfaced two ways: in the
  follower's **stories tray** (Instagram model) AND on the **place page** *if the viewer
  follows the poster* (location context without public exposure).
- Future **"close followers"** tier: poster can narrow a Moment to a hand-picked subset
  (Instagram Close Friends model). Schema supports it now; UI later.
- Tap-through full-screen viewer (story format). Each view is a **spectator event**
  (§7) — deduped per viewer, dwell-weighted, bot-resistant — but the audience is
  followers, so "spectators" = engaged followers, and the payout rides on **follower
  reach**, not public strangers.
- Viewer actions: **react**, **report**, and (for non-followers who see a shared/
  reshared moment) **follow** — the growth loop that expands the payable audience.

### 5.3 The creator ladder (prepared, not paid now)
- Creator profile shows **moments + follower count + follower-engagement** (vanity now,
  payout basis later, per D-6).
- No money mechanics in the UI yet — the *counting is real from day one* so early
  creators build a track record that later converts.

**Psychology applied:** ephemerality lowers posting stakes (supply); follower-scoping
raises **safety and intimacy** (you post for people you chose) at the cost of raw reach;
identity + a growing following is the status asset that later monetizes. This is the
Instagram-stories loop with a location spine — deliberately NOT the public Snap-Map
rail, because D-3 traded public reach for safety.

**Trade-off to accept openly:** follower-scoping means a first-time user with zero
followers posts to nobody — so Stories-first (D-5) depends on Brooks' existing social
graph, and onboarding must help users **build/import a following** before it feels alive.

---

## 6. Data model

New tables (additive; v1 tables unchanged). Names indicative.

### 6.1 Discovery / places
- `community_places` (v1) **+ city index**: add `city`, `country`, and a trigram/name
  index for search. (Enables D-2 remote search.) Launch scope = **Tbilisi only** (Q1).
- **+ Stories-safety columns (prepared now, enforced later per Q4):**
  `stories_excluded bool DEFAULT false`, `sensitive_category text` (e.g. SCHOOL,
  KINDERGARTEN, CHILDCARE, CLINIC, WORSHIP). A launch-off toggle flips enforcement on
  without a migration; also backs the §9.3 Art. 9 geofence.

### 6.2 Q&A
- `right_now_question` — `id, place_id, asker_user_id (private, NOT shown), body_text
  (nullable), preset_key (nullable), is_free_text, status(OPEN/ANSWERED/EXPIRED),
  created_at, expires_at`. *Anonymity:* `asker_user_id` stored for abuse control but
  **never returned** in any DTO.
- `right_now_answer` — `id, question_id, responder_user_id (private), body_text
  (nullable), status_chip (nullable), presence_verified bool, contributor_tier,
  corroboration_count, helpful_count, created_at`. Anonymous on read; identity kept
  server-side only for moderation + future payout attribution.
- `right_now_answer_helpful` — `answer_id, voter_user_id, created_at` (unique) → the
  **helpful signal** feeding §7.
- Reuse v1 `right_now_report_flag` / moderation tables for reports on free text.

### 6.3 Stories
- `location_moment` — `id, place_id, author_user_id (SHOWN to audience), media_ref (GCS),
  media_type (PHOTO at launch; VIDEO column-allowed, flag-enabled later), caption,
  visibility enum=FOLLOWERS | CLOSE_FOLLOWERS (future),
  delay_minutes, created_at, expires_at (created_at+24h), taken_down_at`. **No
  PLACE_PUBLIC value** (D-3 revision) → the public-polling stalking oracle is designed out.
- `moment_audience` (only for CLOSE_FOLLOWERS narrowing) — `moment_id, allowed_user_id`.
- `location_moment_view` — `id, moment_id, viewer_user_id (must be a follower),
  dwell_ms, is_unique bool, created_at` → the **follower-engagement ledger** (append-only).
  Reuse Brooks' existing follow graph rather than a new `creator_follow` table if present.
- Audience resolution is server-side at read time: a place page shows a Moment only if
  `viewer ∈ author.followers` (and ∈ close-followers set when narrowed).

### 6.4 Presence (unchanged principle)
No raw responder/poster coordinates persisted. Presence proven transiently in-memory
(v1 GeoProximity), only the **boolean** `presence_verified` and coarse status persist.

---

## 7. Monetization-prep: the dormant value ledger (build now, pay later)

The single most important architectural decision. Build a **generic, append-only,
idempotent value-event ledger** now; wire **no disbursement**. Later, paying people is
a batch job over this ledger + the existing manual payout flow.

### 7.1 One event stream
`value_event` (append-only, immutable). **The fraud columns are non-negotiable NOW** —
fraud is only provable from signals captured at emit time; a missing column = an
exploit that is unauditable forever (RedTeam game-theorist finding):
```
id                  uuid
event_type          enum: ANSWER_HELPFUL | ANSWER_CORROBORATED | MOMENT_VIEW |
                          MOMENT_UNIQUE_VIEW | MOMENT_REACTION | (future: TIP, BOUNTY)
subject_ref         crypto-shred key ref → earner identity  (NOT the raw user_id; see §8)
source_ref          question_id / answer_id / moment_id
place_id            + place_traffic_tier   -- normalize per-place; kills hero-camping
raw_dwell_ms        + client_reported bool + foreground_verified bool  -- NEVER pre-collapse to weight
session_id, event_ts (server receipt), epoch_id  -- seal events into payout periods; no backfill
actor_ref           who generated it (crypto-shred) -- for fraud graph, never paid
actor_device_id, actor_ip_hash, install_id, actor_account_age_at_event, actor_trust_snapshot
idempotency_key     text UNIQUE  -- (event_type + source_ref + actor) → no replay double-count
```
- **Idempotent capture** stops replay; **but not Sybils** — that's why device/IP/age/edge
  columns are captured now, so a retroactive sweep can zero-weight fraud rings.
- **Weight is COMPUTED LATER, not stored** — keep `raw_dwell_ms` so weight can be
  recomputed under a hardened formula (cap, log-scale, server-clock cross-check).
- **Retain the directed `actor_ref → subject_ref` edge** — collusion rings ("I view
  yours, you view mine") are invisible later without it.
- **Inert now:** we *record* events; we compute nothing payable.

### 7.2 Accrual, separated from disbursement (double-entry discipline)
- `earnings_accrual` (later, but schema-reserved): periodic job folds `value_event` →
  per-creator accrued units against a **pool** (creator-fund model: your share = your
  weighted events / total weighted events × pool). Normalizing against a pool caps
  liability and resists absolute gaming.
- **Disbursement stays exactly as today:** manual bank transfer + the existing guide
  payout ledger, with `REVERSED/CLAWBACK` states already proven in that ledger. v2 adds
  no auto-money. This keeps it consistent with the audited manual flow and sidesteps
  KYC/tax/marketplace-license questions until you choose to cross them.

### 7.3 Game-resistance built in from day one
- Unique-viewer dedup, dwell threshold, velocity caps, actor≠subject (no self-earn),
  collusion detection on `actor_user`↔`subject_user` graphs. All computable later from
  the same append-only stream because we captured `actor_user` now.

### 7.4 Why this is the right "prepare for the future" answer
You asked that the architecture be *prepared* for payouts without building them. This
delivers that precisely: **the only thing missing later is a job and a human clicking
"pay"** — no migration, no re-instrumentation, no retroactive metric reconstruction.

---

## 8. DPIA — privacy & abuse (RedTeam-hardened; see §9 for the adversarial pass)

**Invariants carried from v1:** no raw responder coordinates persisted; Q&A anonymous;
requests target only curated places (can't point at a private home).

**New surfaces, new risks:**
| Risk | Vector | Mitigation |
|---|---|---|
| Stalking via stories | Real-time "User A is at X now" | Place-level only (never precise), optional 15-min delay, no people-list, identified+consented, easy takedown, block/report |
| Doxxing via free text | Answer/question names a person | Free-text moderation (block-list, rate-limit, report), present-user-gated answers, human review queue |
| Minor safety | Under-18 posting location | Age gate on Moments; stricter defaults for minors; no payout eligibility |
| Re-identification of "anon" answers | Small k-anonymity set | v1 suppression rule (hide when responders < k) carries to answers |
| Engagement tracking (GDPR) | `value_event`/`moment_view` profiling | Lawful basis + consent for analytics; retention limits; anon-hash viewers where possible; DPIA before payout goes live |
| Payment/tax exposure | Paying contributors later | Deferred by design — no auto-disbursement now; KYC/threshold decided at payout phase |

**Consent surfaces:** location-eligibility consent (v1) for answering; a distinct
**publication consent** at Moment capture (public, named, 24h).

---

## 9. Adversarial pass (RedTeam) — EXECUTED 2026-08-12

Six parallel adversarial agents (threat-modeler, social-engineer, game-theorist,
GDPR/legal, second-order-effects, devil's-intern). Critical findings and the design
changes they force:

### 9.1 SAFETY — the stalking oracle (CRITICAL, must fix before ship)
Three v2 surfaces **combine** into a tool to locate a named person in real time:
- **Named-person questions via remote free-text:** attacker anywhere posts "Is @victim
  here now, blue jacket?" at the victim's home/work place; anonymous present users
  helpfully answer. Remote-ask + present-crowd = a human location sensor aimed at a person.
  → **FIX:** NER + @handle detection blocks any question whose *subject is a person*.
  Questions must map to place attributes only. Ban the "is X here" class.
- **Remote Moment polling:** ~~identified place-public Moments let an attacker script-poll
  every place in a city for the target's handle~~ → **RESOLVED by the D-3 revision:**
  Moments are now **follower-scoped**, so there is no public place feed to poll — only
  people the poster chose to accept as followers ever see a Moment. Residual risk (a
  hostile *follower* tracking the poster) is handled by: **block** (removes their
  follow + feed access), the future **close-followers** narrowing, optional jittered
  delay, and a **"go ghost" per-post** toggle. This was the RedTeam's #1 safety risk and
  the follower-scoping decision designs it out at the architecture level.
- **Answerer de-anonymization by intersection:** ask a hyper-specific question about a
  low-traffic place → only 1–2 can answer → intersect with who posted an identified
  Moment there in the same window. → **FIX:** k-anonymity suppression on answers (hide
  when present-population < k, k≥5); **separate the anonymous answer from `actor_ref`**
  (no shared join key that links payout attribution to the visible anon answer).

### 9.2 TRUST — presence spoofing is the keystone (CRITICAL)
Every trust signal ("TRUSTED local", "corroborated", "present") inherits from a GPS ping
the *client* asserts. Mock-location apps/emulators/VPN let one person farm dozens of
venues from a couch. → **FIX:** never trust a single ping. Require **Play Integrity /
DeviceCheck** attestation (blocks emulators/root), multi-signal corroboration (Wi-Fi
BSSID / cell tower + motion entropy), **server-side velocity checks** (can't be 20km
apart in 3min), instant-disqualify on mock-location flag, rate-limit presence grants
per device. Corroboration (≥2 independent present users) before an answer reads
"confirmed"; single answers stay visibly provisional.

### 9.3 GDPR — three hard-law conflicts (CRITICAL)
- **Right to erasure (Art. 17) vs append-only ledger:** immutability is not a lawful
  excuse; an unerasable PII-keyed ledger is a per-record ongoing violation. → **FIX
  (this is why the schema above uses `subject_ref`/`actor_ref`, not raw user_id):**
  **crypto-shredding** — per-user key; erasure destroys the key, the ledger keeps a
  null-tombstoned integer. **Never make PII a load-bearing primary key in an immutable store.**
- **No lawful basis for engagement/location profiling:** the value-ledger is behavioural
  + location profiling; legitimate-interest fails the balancing test. → **FIX:** explicit,
  unbundled, opt-in **consent** for the ledger; app must be fully usable with it declined;
  a **DPIA is mandatory** (Art. 35) — location + systematic monitoring, not optional.
- **"Anonymous" is actually pseudonymous** (user_id retained server-side) → calling it
  "anonymous" is a misrepresentation. → **FIX:** relabel "**shown without your name**";
  auto-purge the identity link after the moderation/payout window (~90d) via the same
  crypto-shred key. Also: **geo-fence sensitive POI categories** (clinics, worship,
  etc.) out of Stories + ledger (Art. 9); **age-gate** and **disable the ledger/payout
  for under-16s**; expire Moment media **and** its view rows together.

### 9.4 STRATEGY — the convergent business risk (HIGH, shapes phasing)
Two independent agents converged on the same root: **rewarding volume/spectators
retroactively poisons the free, altruistic vibe that is the entire value prop**, and the
feature risks being **two products** (a local-Q&A utility + an ephemeral-stories network)
each needing different critical mass, bootstrapped in neither.
- Cold-start is *worse* with remote asking: questions hit dead places → "no answers yet"
  is the loudest possible dead-app signal. → **FIX:** gate asking to places above a live-
  presence threshold; below it show cached recent answers or an honest async promise,
  never a hanging question. Launch **one city dense**, not global.
- Incentive fix (weakens 4 of 6 risk chains at once): **reward asker-marked-helpfulness +
  present-verification, NOT raw spectator count.** Cap/decay per-place earnings so farming
  a dead or hero place pays ≈0. Never surface earning potential inside the answer flow.
- Wedge Google/Instagram structurally can't copy: **subjective, textural, human**
  questions ("safe for a woman here at 11pm?", "awkward to eat alone?") — not "how busy",
  which Google Popular Times already answers for free with a billion-device signal.

### 9.5 Verdict
Fundamentally buildable, but **three things are ship-blockers, not polish:** (1) the
person-targeting/stalking oracle, (2) presence attestation, (3) the GDPR erasure +
consent design. And one **strategic reframe** should be decided before build: sequence
the two loops and fix the incentive to reward *helpfulness*, not *volume*.

---

## 10. Phasing — what to build now vs later

**Phase A1 — Stories first (D-5):**
- Place page IA + place search (city/name) — the spine both loops hang off.
- Moments: capture/post (present-only, consented), 24h, **follower-scoped** feed +
  place-page-if-you-follow, viewer, react, block, "go ghost". Reuses existing follow graph.
- Onboarding that helps a user **build/import a following** so the feed isn't empty.
- **Value ledger live but inert** (record `value_event` + `location_moment_view`) with
  the full fraud-forensic + crypto-shred schema from §7.1 (cheap now, impossible to retrofit).

**Phase A2 — Q&A second:**
- Q&A: presets + free text, present-user answering, anonymous, helpful votes, moderation.
- Anti-ghost-town gate + person-targeting guard (below).

**Ship-blockers (from §9 — build these IN Phase A, not later):**
1. Person-targeting guard: NER/@handle block on questions; k-anonymity answer suppression.
2. Presence attestation: Play Integrity/DeviceCheck + velocity checks + mock-location reject.
3. GDPR spine: crypto-shred keys (no PII primary keys), opt-in ledger consent, DPIA,
   sensitive-POI geofence, under-16 exclusion, "shown without your name" relabel.
4. Anti-ghost-town gate: no hanging questions at dead places.

**Recommended reframe to decide first (§9.4):** launch one city dense; sequence the two
loops rather than shipping both cold; reward asker-verified helpfulness, not spectator
volume; aim free text at subjective questions Google can't answer.

**Phase B (later, paid):**
- Accrual job + pool math; answerer tips/bounties; creator payout via existing manual
  ledger; KYC/tax gate; anti-fraud jobs over the already-captured event stream.

**Explicit now/later boundary:** if it touches *money movement*, it's Phase B. If it
touches *recording who earned what*, it's Phase A (so nothing is lost).

---

## 11. Resolved scope decisions (Boris, 2026-08-12)

| # | Decision | Build-now consequence |
|---|---|---|
| Q1 | **Tbilisi only** at launch | Seed the `community_places` gazetteer for Tbilisi (hero places: Fabrika, Rustaveli, etc.); scope place-search to Tbilisi; one dense city per the RedTeam's cold-start fix. |
| Q2 | **Photos only** at first | `location_moment.media_type` constrained to `PHOTO` at launch; the column still permits `VIDEO` so enabling it later is a flag, not a migration. |
| Q3 | **Close-followers = later**, architecture prepared now | Already covered: `visibility` enum includes `CLOSE_FOLLOWERS` + `moment_audience` table exists (§6.3); UI deferred. No schema debt when it ships. |
| Q4 | **Exclude kid-related POIs** (schools, kindergartens, etc.) — a **future** enforcement, architecture ready now | Add `community_places.stories_excluded bool` + a `sensitive_category` taxonomy column now; leave enforcement toggle off at launch, flip on later. Same mechanism serves the §9.3 Art. 9 sensitive-POI geofence. |
| Q5 | **Automated moderation** only (no human queue) | Free-text pipeline = block-list + PII/NER (person-name/@handle/address/phone) detection + rate-limit, all synchronous pre-publish. **Residual risk to accept:** automated-only lets some abuse through — so keep every Moment/answer **reportable**, auto-**quarantine** on a report-diversity threshold, and revisit a human queue if volume/abuse grows. |

### Phase A1 (Stories, Tbilisi, photos) — concrete launch scope
- Tbilisi place gazetteer + hero-place seeding + Tbilisi-scoped place search.
- Photo Moments, 24h, follower-scoped, place-page-if-you-follow, react, block, "go ghost".
- `visibility` + `moment_audience` + `stories_excluded`/`sensitive_category` columns present
  but their advanced paths (close-followers UI, kid-POI enforcement, video) **dormant**.
- Value ledger live-but-inert with full §7.1 fraud-forensic + crypto-shred schema.
- Automated free-text/media moderation; report + auto-quarantine.
- Presence attestation (Play Integrity + velocity) — the §9.2 keystone.
- DPIA + GDPR crypto-shred spine before ship (§9.3).

> Design is now decision-complete for Phase A1. Next artifact is an implementation plan,
> not more design.
```
