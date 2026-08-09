# BOR-86 — "Right Now": Community-Powered Live Location Updates

**Design + DPIA + implementation spec.** Status: **approved direction, v1 in build.** Author: automated implementation session. Date: 2026-08-08.

> Non-negotiable invariant: Brooks answers **"what is this _public place_ like right now"**. It must be **architecturally impossible** for the feature to answer **"where is _this person_ right now"** — enforced by curated public-POI-only targeting, boolean coarsened presence, k-anonymity, and total responder anonymity.

---

## 1. Approved direction

Feature name: **"Right Now"** (replaces the working title "Get condition"). A user opens a **public place** and taps **"Ask Right Now"**; people who can prove they are currently at that place voluntarily answer with a short **structured** status; the freshest, corroborated, still-valid answers show on the place — and expire.

Chosen architecture (from a five-option comparison): **Hybrid, built Ask-the-Place-first.** v1 is the maximum-privacy slice — **zero standing presence, no live location, no live dot, no track.** Presence exists only as a transient "near this public place in the last few minutes" proof that is verified and discarded. Passive-busyness and opt-in notify-boost layers are a documented v2/v3 path that does not require re-architecting.

Approved by Boris 2026-08-08 (privacy posture: "zero live tracking, safest").

---

## 2. v1 scope (RedTeam-driven)

Two independent adversarial reviews (de-anonymization/stalking + trust-safety/GDPR) converged on shrinking v1 to **structured-status-only**. That still satisfies every BOR-86 acceptance criterion.

### In v1
- **POI gazetteer** — curated public, non-sensitive places only; `footfall_class` high/med only; sensitive categories excluded by policy + schema.
- **Ask Right Now** — creates or dedupes into one open request per POI+time-window; **distinct-asker** demand counter shown **bucketed** ("a few / several / many"), jittered.
- **Answer eligibility** — server-side proximity check within a per-POI radius `R` at submit time, **plus device attestation and a dwell/velocity check**. Raw GPS is used in memory and **never persisted or logged**; only `in_radius`(boolean) + `attested` + `dwell_ok` persist.
- **Structured status** — enum `{quiet, normal, busy, closed}` (+ optional coarse wait-time bucket). **No free text, no photo in v1.**
- **k-anonymity gate** — a report/presence signal is surfaced only when ≥ `K_show` distinct responders exist for the window; below-K is stored for moderation only, never emitted. `"1 person says…"` is never rendered.
- **Corroboration gate** — negative facts (`closed`) show hedged ("unconfirmed") until ≥ corroboration threshold of distinct trusted contributors; faster expiry.
- **Freshness** — coarse ≥15-min relative age with jitter (never exact timestamps); server-authoritative read-time expiry.
- **Trust** — binary "helpful" vote (no self-vote, one per user per report, rate-limited); ranked by Wilson lower bound + time decay + trust weight; contributor shown at most a coarse **`trusted`** tier — **no per-report count, no client-visible or cross-POI-linkable author id**.
- **Safety** — report-a-response with a category taxonomy → moderation queue (critical categories auto-hide); **block-a-contributor** (hides content both ways + blocks reverse interaction); sensitive/low-footfall POIs excluded.
- **Public "Right Now" card** — only with explicit per-response consent, `K_public`-gated, high-footfall POIs only, **status + coarse age only** (no photo/text/reputation/fine timing); revocable, invalidated on removal/expiry.
- **Consent + DPIA** — granular, un-pre-ticked consent for location processing; DPIA (this doc, §7).

### Deferred to v2 (documented, NOT built in v1)
Free text (needs pre-publication doxxing/harassment moderation) · photos (needs CSAM hash-scan + quarantine + EXIF strip + biometric policy) · push routing to opted-in nearby responders · Sybil ring-detection graph jobs · business claim / counter-notice channel · full DSAR self-serve erasure endpoint · passive-busyness pulse layer.

---

## 3. Data model (Flyway V66, new `community` module)

All tables use `gen_random_uuid()` PKs, `TIMESTAMPTZ` timestamps, `REFERENCES users(id) ON DELETE CASCADE`, matching existing convention. **No table stores a raw coordinate for a responder.**

| Table | Purpose | Privacy-critical columns |
|---|---|---|
| `community_places` | Curated public-POI gazetteer | `latitude/longitude` (the PLACE, public), `category`, `footfall_class` (`low`/`med`/`high`), `radius_meters` (per-POI R), `public_card_allowed`, `is_active`, `excluded_reason` |
| `right_now_requests` | Open "asking" per POI+window | `place_id`, `window_started_at`, `expires_at`; counter is derived, not stored |
| `right_now_request_participants` | Distinct askers (dedup + count) | `request_id`, `asker_id`, `UNIQUE(request_id, asker_id)` — count DISTINCT; **no location** |
| `right_now_reports` | A structured answer | `place_id`, `author_id` (**server-only, never serialized**), `status` enum, `wait_bucket`, `corroboration_count` (feed ordering), `shared_public`, `expires_at`, `hidden_at`, `deleted_at`, `removed_reason` — **no coordinate, no eligibility booleans, no exact age**. A stored report is eligible by construction (the service rejects ineligible submits), so even the pass/fail booleans aren't kept; effective status + anonymity set are recomputed live at read. |
| `right_now_helpful_votes` | Binary helpful | `report_id`, `voter_id`, `UNIQUE(report_id, voter_id)`, CHECK `voter_id != author` (enforced in service against `author_id`) |
| `right_now_reports_flags` | Report-a-response | `report_id`, `reporter_id`, `category` enum (`misleading/outdated/unsafe/harassment/illegal/...`), `state` |
| `community_blocks` | Block-a-contributor | `blocker_id`, `blocked_id`, `UNIQUE`, CHECK `blocker != blocked` — filters reads + reverse writes |
| `community_consent` | Granular consent ledger | `user_id`, `purpose` enum (`location_eligibility`/`public_card`), `version`, `granted_at`, `withdrawn_at` — no pre-ticking |
| `community_moderation_actions` | Immutable audit | `actor_id`, `target_report_id`, `action`, `reason`, `created_at` |
| `contributor_trust` | Derived trust (anti-Sybil) | `user_id`, `helpful_weighted`, `tier` (`none`/`trusted`), recomputed |

Public card is rendered **by reference** to the live report (re-checks expiry/state on each fetch) — never a baked immutable snapshot (prevents stale/removed content resurfacing).

---

## 4. API (all authenticated; `/api/**` is auth-by-default in `SecurityConfig`)

- `GET /api/community/places?north&south&east&west` — public POIs in viewport (Leaflet bounding-box, antimeridian-safe, mirrors memory map query).
- `GET /api/community/places/{placeId}/right-now` — current k-gated reports (status + coarse age), bucketed ask counter. Filters blocked authors, expired, below-K, removed.
- `POST /api/community/places/{placeId}/ask` — join/create the open request (dedup). Sends **no** location.
- `POST /api/community/places/{placeId}/reports` — submit a structured answer. Body carries transient GPS + attestation token (consumed in memory, never stored/logged); persists only booleans + status.
- `POST /api/community/reports/{reportId}/helpful` — binary helpful vote.
- `POST /api/community/reports/{reportId}/flag` — report content (category).
- `POST /api/community/contributors/{userId}/block` / `DELETE …` — block/unblock.
- `POST /api/community/reports/{reportId}/share-public` — consent to public card (K_public-gated).

Viewing and asking endpoints **reject any coordinate field** (contract-tested) — only the answer path ever receives location.

---

## 5. Privacy & anti-abuse mechanics

- **No-coord-persistence invariant** — raw lat/lng exist only as method-local vars for the Haversine + dwell check; a logging filter redacts coordinate patterns; a test asserts no coord value reaches any persistence/log path.
- **Eligibility ≠ client trust** — `attested` (Play Integrity / App Attest) + `dwell_ok` (≥2 samples over `T_dwell`, velocity ≤ `V_max`, GPS accuracy ≤ R) reject spoofers and drive-bys.
- **k-anonymity** — the presence signal itself (not just the counter) is gated by `K_show`, scaled by per-POI/time footfall. Low-footfall POIs excluded from v1.
- **Unlinkable contributor** — `author_id` never serialized; no per-report reputation number (a number is a fingerprint); only a coarse `trusted` tier, hidden below K.
- **False-report / self-dealing defense** — corroboration + trust-weighting gate confident status; a single always-present device (staff) cannot hold a card alone; recurring same-POI answerers are trust-discounted for that POI.
- **Sybil** — trust seeded low for new/unattested accounts; votes/answers weighted; per-account+device+network rate limits; ring-detection deferred to v2 but schema (`contributor_trust`) is ready.
- **Expiry correctness** — read-time server-authoritative filter (`expires_at > now() AND state=approved AND deleted_at IS NULL`); counters recomputed, never incremented-only; public cards re-check on fetch + invalidate on removal. **Property test:** expired/removed content appears in zero read paths.

---

## 6. Parameters (v1 defaults — config + CHECK constraints)

| Param | Default | Meaning |
|---|---|---|
| `K_show` | 3 | Min distinct responders before any report/presence surfaces |
| `K_count` | 3 | Counter visible; buckets: few 3–5 / several 6–10 / many 11+ |
| `K_public` | 5 | Public card threshold; high-footfall POIs only |
| `R` | per-POI, default 50m, cap 200m | Eligibility radius; reject GPS accuracy > R |
| `T_dwell` | 2–3 min, ≥2 samples | Continuous presence proof |
| `V_max` | ~30 m/s | Teleport rejection |
| distance bucket | boolean "here" only | No sub-bucketing (no triangulation) |
| timestamp | ≥15-min relative + jitter | Never exact created_at/expiry |
| `footfall_class` | high/med only in v1 | `low` excluded until activity floor met |
| trust tier | `trusted` at ≥25 lifetime weighted helpfuls | Never a per-report count |
| `closed` corroboration | ≥2 distinct trusted | Negative facts need confirmation; faster expiry |

---

## 7. DPIA — Data Protection Impact Assessment (Georgia Law on Personal Data Protection, in force 2026… i.e. 2024-03-01; GDPR-aligned)

**Processing:** collection of precise device GPS at answer-submit (transient, in-memory only), to verify presence at a curated public place, producing an ephemeral structured status about that place. Real-time presence + user-generated content ⇒ DPIA warranted.

- **Lawful basis:** explicit, granular, freely-given, **un-pre-ticked** consent (`community_consent`), separate purposes: (a) location for eligibility, (b) public-card publication. Refusing (b) never blocks (a) or unrelated app functions.
- **Location = sensitive:** treated as sensitive personal data even though transient. Processing (not just storage) triggers the duties — hence minimization below.
- **Data minimization (encoded as invariant):** raw coordinates held in memory only for the Haversine/dwell computation; **never** written to DB, logs, traces, crash reports, or analytics. Persist only `in_radius`/`attested`/`dwell_ok` booleans + coarse status. Coordinate-sink audit + test enforce this.
- **Retention:** ephemeral content (`right_now_reports`, requests, participants) purged shortly after `expires_at`; `community_moderation_actions` kept only as long as needed for safety/legal (documented, bounded); consent ledger kept for its lifecycle; no raw location retained at all. Every table carries a documented TTL; a purge job is cleanup, not the source of truth (reads already filter on expiry).
- **Data-subject rights:** access/export of own contributions; per-item delete + erasure that propagates to caches and public cards and recomputes counters (full self-serve DSAR endpoint is a v2 hardening, manual process documented for v1).
- **Recipients:** requesters (report body) and, only with consent, public-card viewers (status+age only). No third-party sharing.
- **Residual risk after mitigations:** LOW for person-location (k-gate + no-coord-persistence + no free text/photo in v1 remove the main vectors). Re-assess before enabling text/photo (v2) — those reopen doxxing/CSAM/biometric risk and require pre-publication moderation before launch.
- **DPO / notice:** publish a purpose-specific privacy notice (location, retention, recipients, rights); assess DPO necessity at scale.

---

## 8. RedTeam findings → mitigation traceability (summary)

| Finding | Severity | v1 mitigation |
|---|---|---|
| Single-responder de-anon (6am café) | CRITICAL | k-gate the signal itself; low-footfall excluded; never "1 person says…" |
| GPS spoofing → fake eligibility | CRITICAL | attestation + dwell/velocity; reject accuracy>R; persist only booleans |
| Followable contributor across POIs | CRITICAL | no serialized author id; no per-report count; coarse tier only |
| Free text / photo / EXIF leaks | CRITICAL | **text & photo OFF in v1**; deferred behind moderation/quarantine |
| Single-source "closed/dangerous" defamation | CRITICAL | corroboration gate; "dangerous" not in enum; faster negative expiry |
| Weak "user" ⇒ Wilson gameable (Sybil) | CRITICAL | attestation/phone-hash trust weight; rate limits; ring-detect schema ready |
| Stale/removed content resurfacing | CRITICAL | read-time expiry; card-by-reference; property test |
| Location is sensitive even transient | CRITICAL | consent + minimization invariant + coord-sink audit + DPIA |
| Demand-counter inference/inflation | HIGH | distinct-asker + bucketed + jittered; not authoritative; rate-limited |
| Precise timestamps → arrival correlation | HIGH | coarse ≥15-min relative age + jitter |
| Public card person-beacon drift | HIGH | K_public high-footfall only; status+age only; revocable |
| Block under-specified | HIGH | bidirectional hide + reverse-interaction block; no block leak |

---

## 9. Verification approach (WSL)

App not runnable here (Windows-hosted). Backend verified via `~/.claude/bin/brooks-gradle :app:compileJava` + `:community:test`; frontend via `tsc --noEmit`. Critical invariants covered by unit/property tests: read-time expiry hides expired/removed; k-gate suppresses below-K; self-vote rejected; no coordinate reaches persistence. All changes left **uncommitted** for Boris's git flow.
