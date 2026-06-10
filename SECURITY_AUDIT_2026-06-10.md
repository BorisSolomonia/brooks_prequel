# Brooks — Full Security Audit

**Date:** 2026-06-10
**Scope:** Web client (Next.js in a Capacitor Android WebView), multi-module Spring Boot backend
(auth/user/profile/guide/memory/purchase/search/social/notification/ai/app/common), BOG iPay
payments, Auth0 auth, GCS media, Caddy + Docker infra, Android packaging.
**Method:** Static source review (read-only) + one **passive** HTTPS GET of production for headers.
No exploitation, no scanning, no code changes, nothing committed.
**Repo:** `/mnt/c/Users/Boris/Dell/Projects/APPS/Brooks_prequel` (audited as-is, including uncommitted
working-tree edits to WebhookController, GlobalExceptionHandler, the AI provider clients, and Caddyfile).

---

## Executive summary

**Overall posture: strong.** The authorization model is the standout — every sensitive backend path
enforces ownership or a grant check in the service layer, paid content is gated on a completed
purchase, and the payment webhook is cryptographically verified *and* the amount is re-validated
against BOG server-side. JWT validation (issuer + audience + JWKS), stateless sessions, parameterized
queries, encrypted-at-rest BYO AI keys, a non-leaking exception handler, and non-root containers are
all in place. Production serves a full set of security headers (CSP, HSTS, X-Frame-Options, etc.),
verified live.

**No Critical issues were confirmed.** Two background agents initially flagged Criticals
("missing security headers", "actuator exposed", "secrets in .env"); a passive live check and a
git-history check **disproved or downgraded all three** (see *Corrections* below). The remaining
findings are hardening items: one High (Android `allowBackup`), and a cluster of Mediums around
rate limiting, header provenance, the Gemini API-key transport, and edge config.

### Findings count
| Severity | Count |
|---|---|
| Critical | 0 |
| High | 1 |
| Medium | 6 |
| Low | 6 |
| Info / hygiene | 4 |

### Corrections to automated sub-agent findings (verified against live/git evidence)
- **"Security headers missing (Critical)" → FALSE.** `curl https://brooksweb.uk/` returns
  `content-security-policy` (with `frame-ancestors 'self'`), `strict-transport-security: max-age=31536000; includeSubDomains; preload`,
  `x-frame-options: SAMEORIGIN`, `x-content-type-options: nosniff`, `referrer-policy`, and
  `permissions-policy: camera=(), microphone=(), geolocation=(self)`. Headers exist in prod.
  (They are *not* in the repo — that becomes **M-1** below, a much lower-severity provenance issue.)
- **"Actuator exposed (Critical)" → downgraded to M-3.** Live `GET /actuator`, `/actuator/env`,
  `/actuator/health` all return **404** on production. Spring also gates `/actuator/**` to
  `hasRole("ADMIN")`. The repo Caddyfile *would* proxy `/actuator/*`, so it's a defense-in-depth gap, not an active exposure.
- **"Secrets in .env (Critical)" → Info/hygiene.** `infra/.env` and `brooks-485009-*.json` and
  `localhost.har` are **gitignored and were never committed** (`git log --all -- <file>` empty for
  all). A local untracked `.env` is normal; CI uses GitHub Secrets + GCP Secret Manager.
- **"Gemini key in URL (Critical)" → Medium (M-2).** Real, but it is the user's *own* BYO key sent
  server-side to Google over HTTPS; blast radius is Brooks's own logs, not third parties.

---

## High

### H-1 — Android `allowBackup="true"` allows extraction of WebView session data
- **File:** `web/android/app/src/main/AndroidManifest.xml:4`
- **Evidence:** `android:allowBackup="true"`
- **Risk:** With backup enabled, app-private data (WebView cookie store, including the Auth0 session
  cookie used by the production site loaded in the WebView) can be pulled via `adb backup` or
  auto-backup on a rooted/compromised device and replayed. Note the *access token* itself is **not**
  in localStorage (good — it's fetched server-side and held in memory), so the primary exposure is
  the session cookie / any cached WebView state.
- **Fix:** Set `android:allowBackup="false"` (simplest), or add a `BackupAgent` with `fullBackupContent`
  rules that exclude the WebView cookie/storage directories.

---

## Medium

### M-2 — Gemini API key transmitted in the URL query string
- **File:** `backend/ai/src/main/java/com/brooks/ai/provider/GeminiClient.java:42`
- **Evidence:** `String url = BASE_URL + resolvedModel + ":streamGenerateContent?alt=sse&key=" + apiKey;`
- **Risk:** Query-string secrets leak into access logs, proxy logs, and APM traces far more readily
  than headers. The Anthropic and OpenAI clients in the same package use a hardcoded base URL with
  header auth — Gemini is the inconsistent one. It is the user's own key, over HTTPS, so impact is
  bounded, but log hygiene is the concern.
- **Fix:** Send the key via the `x-goog-api-key` request header (the generativelanguage API supports
  it) instead of the `?key=` parameter, matching the other two providers.

### M-3 — `/actuator/*` reverse-proxied at the edge
- **File:** `infra/Caddyfile:26-28` (`handle /actuator/* { reverse_proxy backend:8080 }`)
- **Context:** Spring exposes `health,info,metrics,prometheus`
  (`backend/app/src/main/resources/application.yml:135`) and gates `/actuator/**` to `ADMIN`
  (`SecurityConfig.java:55`). Live production returns 404 for `/actuator*`, so the deployed edge
  differs from this working-tree Caddyfile — but the committed config would route it.
- **Risk:** Defense-in-depth gap — only the Spring ADMIN gate would stand between the internet and
  `metrics`/`prometheus` if the edge proxied it.
- **Fix:** Don't proxy `/actuator/*` publicly at all (remove the `handle` block), or restrict it to
  the internal network / a management port. Keep `management.endpoints.web.exposure.include` minimal.

### M-1 — Production security headers are not in version control
- **Files:** absent from `infra/Caddyfile`, `web/next.config.js`, `web/src/middleware.ts`
  (grep for `Content-Security-Policy|Strict-Transport-Security|frame-ancestors` returns nothing in
  the repo, yet they are present on live responses).
- **Risk:** The CSP/HSTS/X-Frame headers are applied by a deployed edge layer that isn't captured in
  the repo. A deploy path that bypasses that layer (or a future infra migration) would **silently
  drop all of them** with no diff to catch it in review.
- **Fix:** Codify the header set in the Caddyfile (or Next.js `headers()`), so the protection is
  reproducible and reviewable. Bonus: the live CSP uses `script-src 'unsafe-inline'` — tighten with
  nonces/hashes if Next.js config allows.

### M-4 — No rate limiting on sensitive public/abusable endpoints
- **Files:** `infra/Caddyfile` (no `rate_limit`); `backend/.../AccountDeletionController.java`
  (`/api/account/delete-request`, `/api/account/delete/confirm`); the geo-reveal endpoints
  (`POST /api/memories/{id}/reveal`, `POST /api/memory-shares/{token}/reveal`).
- **Risk:** (a) deletion-request spam; (b) **location brute-force** — a grant holder can submit
  arbitrary coordinates to the reveal endpoint repeatedly; without throttling, an attacker could
  grid-search to unlock a memory's content without physically being within 100 m. The content stays
  redacted until a coordinate inside the radius is submitted, but the radius can be discovered by
  brute force given the approximate location already returned in the teaser.
- **Fix:** Add per-IP / per-user rate limits at the edge (Caddy `rate_limit`) and specifically cap
  reveal attempts per memory per user (e.g., N/min with backoff).

### M-5 — Overly broad Capacitor `allowNavigation` wildcards
- **File:** `web/capacitor.config.ts` (`allowNavigation` includes `*.googleapis.com`, `*.gstatic.com`)
- **Risk:** Wildcards admit far more origins than needed into the WebView navigation allowlist.
- **Fix:** Pin to the specific subdomains actually used (e.g., `storage.googleapis.com`,
  `www.googleapis.com`).

### M-6 — Payment webhook lacks explicit replay/idempotency tracking
- **File:** `backend/purchase/src/main/java/com/brooks/purchase/api/WebhookController.java`;
  `PurchaseService.handleCheckoutCompleted` / `markCompletedIfPending`
- **Risk:** Largely mitigated — completion is an atomic `UPDATE ... WHERE status=PENDING`, and the
  RSA signature blocks forgery, so a true double-credit is prevented. The gap is purely the absence
  of an explicit processed-callback ledger (a narrow concurrent-retry window relies entirely on the
  atomic update).
- **Fix:** Persist a processed-callback key (order_id + status) and short-circuit duplicates; keeps
  metrics/audit clean and removes reliance on the race-free UPDATE alone.

---

## Low

- **L-1 — `dangerouslySetInnerHTML` in onboarding tour.** `web/src/components/onboarding/OnboardingTour.tsx:428`
  renders `step.illustration` as raw HTML. Safe *today* (content is static, developer-authored tour
  data), but it's an XSS sink the moment that field becomes dynamic/server-sourced. Sanitize
  (DOMPurify) or keep it provably static.
- **L-2 — Calendar OAuth `returnTo` not validated as same-origin.**
  `web/src/app/api/calendar/google/callback/route.ts:11,15` resolves a cookie-sourced `returnTo`
  against the base URL. `state` is correctly validated (CSRF ok), but if the `returnTo` cookie can be
  influenced, `new URL(returnTo, base)` permits an absolute off-site redirect. Restrict to relative
  paths (reject values containing `://` or starting with `//`).
- **L-3 — `window.open` without `noopener`.** `web/src/components/calendar/AddToCalendarModal.tsx`
  uses `'_blank','noreferrer'` but not `noopener`. Add `noopener`.
- **L-4 — Android FileProvider broad scope.** `web/android/app/src/main/res/xml/file_paths.xml`
  grants `path="."` for external/cache. Narrow to a dedicated subdirectory. (Provider itself is
  `exported="false"` — good.)
- **L-5 — `X-Forwarded-For` first-hop trust.** `AccountDeletionController` takes the first XFF value
  for audit logging. Mitigated by a length cap and `getRemoteAddr()` fallback; only as trustworthy as
  the edge proxy's XFF hygiene. Fine if Caddy overwrites XFF.
- **L-6 — Pre-reveal metadata exposure (by design).** Locked memory teasers/pins return
  `hasImage`/`hasAudio` and an approximate location before reveal. Intentional UX, but it does
  disclose existence-of-media and rough coordinates to a grantee before they reach the spot. Documented, not a defect.

---

## Info / hygiene

- **Secrets never committed (verified).** `infra/.env`, `brooks-485009-*.json`, `localhost.har` are
  all gitignored and absent from full git history. CI uses GitHub Secrets + GCP Secret Manager
  (`.github/workflows/deploy.yml`). `application.yml` uses only `${ENV}` placeholders. Keep it this way.
- **`npm audit`: 4 vulns (3 high, 1 moderate), all transitive/build-time.** `postcss` (moderate, CSS
  stringify XSS — only matters when processing attacker CSS) and `tar` (high, build tooling) pulled
  via `next`'s dev tree. Direct `next` is 14.2.25 (current enough). Run `npm audit fix`; no runtime
  exposure identified.
- **Local profile placeholders.** `application-local.yml` carries all-zero encryption secrets and
  `test_*` BOG creds as dev defaults behind `${ENV:default}`. Dev-only; production overrides via env.
  Confirm prod sets `AI_KEY_ENCRYPTION_SECRET` etc. (unverifiable from here).
- **Unverified (needs dashboard/runtime confirmation):** Auth0 tenant allowed-callback/logout URLs;
  Postgres `sslmode`; production env actually overrides the local placeholders; Mapbox token scope;
  GCS bucket IAM least-privilege; Google Calendar OAuth scope minimization.

---

## Positive controls verified (with evidence)

**Authentication / session**
- JWT validated with issuer + audience + JWKS; stateless; `denyAll()` fallback — `SecurityConfig.java:53-105,140-155`.
- CORS origins from config (no wildcard), explicit header allowlist — `SecurityConfig.java:121-137`.
- CSRF disabled correctly (Bearer-token API, no auth cookies) — `SecurityConfig.java:51`.
- Web access token fetched server-side, held in memory, **never** in localStorage/cookie —
  `web/src/hooks/useAccessToken.ts` (grep for `localStorage` in token paths: none).

**Authorization / IDOR**
- `getMemory`/`updateMemory`/`deleteMemory` go through `findOwnedMemory` — owner-only, returns 404
  (not 403) to avoid existence disclosure — `MemoryService.java:430-437`.
- Content redaction: `contentVisible` requires owner / public / revealed-grant; `toResponse` nulls
  `textContent` and empties `media` when not visible; map pins redact preview + media flags —
  `MemoryService.java:480-534,560-586`.
- Reveal gated on active grant **and** distance ≤ unlock radius; content returned only when revealed
  — `MemoryService.java:340-404`.
- Public share teaser returns only sender name/avatar/place/approx-coords — no content/media —
  `MemoryService.java:313-336`.
- Direct share requires recipient to follow the creator — `MemoryDirectShareService` (follow check).
- Media object names bound to `memories/{images,audio}/{ownerId}/` with backslash normalization —
  prevents attaching another user's object — `MemoryService.java:636-662`.
- Guide edit/delete via `@PreAuthorize("@guideAuthz.canEdit(...)")`; reviews require a completed
  purchase; trips/purchases scoped to buyer; paid content gated on `PurchaseStatus.COMPLETED`.

**Payments (BOG iPay)**
- RSA-SHA256 signature verified over the raw body before any processing; **fails-fast on key load**;
  rejects missing/blank/invalid signatures (no bypass) — `BogCallbackVerifier.java`,
  `WebhookController.java:54-65`.
- Order price computed server-side from `guide.getPriceCents()`; on completion the service re-fetches
  BOG Payment Details and rejects on **amount or currency mismatch** — `PurchaseService.java:318,507-539`.
- Atomic `markCompletedIfPending` prevents double-credit.

**Injection / SSRF / XSS**
- Repository `@Query` uses `@Param` placeholders; no string-concatenated SQL/JPQL found.
- AI provider base URLs are hardcoded constants — user supplies only the key, not the endpoint
  (no SSRF) — `AnthropicClient.java:23`, `OpenAiClient.java:25`, `GeminiClient.java:24`.
- No `eval`/`new Function`; only one `dangerouslySetInnerHTML` (static, see L-1).

**Media / storage**
- Content-type allowlist (JPEG/PNG/WebP/MP3/M4A/WebM/OGG/WAV) + size cap (10 MB);
  local-serve path-traversal guard (`..` reject + normalized `startsWith`) — `MediaStorageService.java`, `MediaController.java`.

**AI keys & assistant**
- Encrypted at rest; only last-4 hint returned; raw key never in responses — `AiKeyService.java`.
- **Refunds are not user-triggerable.** There is no public/user refund endpoint —
  `handleCheckoutRefunded` is invoked only from the signature-verified BOG callback
  (`WebhookController.java:108-109`); admin financial endpoints sit under `/api/admin/commission`,
  gated by the `/api/admin/**` → `hasRole("ADMIN")` rule.
- **Prompt-injection blast radius is bounded to the editing user's own guide.** The AI guide
  assistant emits `<action>` tags that the client applies to the *in-memory guide currently being
  edited*; every persist still goes through the authenticated guide-update API
  (`@PreAuthorize("@guideAuthz.canEdit(...)")`). A poisoned prompt cannot reach another tenant's
  data because each mutation is re-authorized server-side. Residual risk is limited to the user
  garbling their own draft — acceptable; no cross-user escalation path.

**Error handling / infra**
- Catch-all exception handler returns generic "An unexpected error occurred" — no stack traces —
  `GlobalExceptionHandler.java:77-84`.
- Account-deletion endpoints non-enumerating (always 200) — `AccountDeletionController.java`.
- Backend and web containers run as non-root; Postgres not port-exposed — `backend/Dockerfile`,
  `web/Dockerfile`, `infra/docker-compose.yml`.
- Live security headers present (CSP/HSTS/X-Frame/nosniff/Referrer/Permissions) — verified via curl.
- `assetlinks.json` fingerprints correct; App Links + custom scheme configured;
  `allowMixedContent:false`; target SDK 35.

---

## Prioritized remediation

1. **H-1** — set `android:allowBackup="false"` (or exclude WebView storage). *One line.*
2. **M-1** — codify CSP/HSTS/X-Frame/etc. in the Caddyfile so they're version-controlled.
3. **M-3** — stop proxying `/actuator/*` publicly at the edge.
4. **M-4** — add edge rate limiting + a per-memory reveal-attempt cap (location brute-force).
5. **M-2** — move the Gemini key to the `x-goog-api-key` header.
6. **M-5 / M-6 / Low items** — tighten `allowNavigation`, add webhook dedup ledger, fix the
   `returnTo`/`noopener`/FileProvider items.
7. **Info** — run `npm audit fix`; confirm prod env overrides local placeholder secrets and Postgres SSL.

*No application code was modified, no scans were run against production (only passive header GETs),
and nothing was staged or committed during this audit.*
