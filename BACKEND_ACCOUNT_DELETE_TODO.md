# Backend — Account-deletion endpoints TODO

> 🟢 **Status update (May 2026):** the Spring side has been **implemented** (controller, service, entities, repos, migration V47, listener, security config) and **unit-tested** (`AccountDeletionServiceTest` — 14 scenarios). This doc is preserved as the long-form reference for the backend contract.
>
> Two bugs found in code-review on 2026-05-15 are now patched:
> 1. **Stale cache after soft-delete.** `UserService.findByAuth0Subject` is `@Cacheable`; the cached entity wasn't being evicted on deletion. Fixed by injecting `CacheManager` into `AccountDeletionService.performSoftDelete` and calling `cache.evict(auth0Subject)` after the user row is persisted.
> 2. **PostgreSQL `INET` column vs Java `String` mismatch.** `account_deletion_requests.source_ip` was declared `INET` in V47 but bound as `String` in the entity — PostgreSQL won't implicit-cast VARCHAR to INET. Changed the SQL to `TEXT` (IP precision wasn't being used anyway).
>
> Two known limitations still outstanding (acceptable for first Play release; deferred to follow-up):
> - DELETED users can still sign in via Auth0 — `findOrCreateUser` doesn't gate on status. Their content is gone and PII is anonymised, but the session works. Add a gate in `AuthCallbackController` later.
> - Public `/account/delete-request` has no rate limit. Caffeine is already on the classpath; a 5-per-IP-per-hour bucket would be a few lines. Add before opening the public URL to general traffic.

The Next.js frontend has two Account-Deletion entry points required by Google Play Console (and Apple App Store). Both forward to the Spring backend.

---

## Endpoint 1 — Authenticated in-app deletion

`POST /api/account/delete`

### Request

| Header | Value |
|---|---|
| `Authorization` | `Bearer <Auth0 access token>` — validate against the same JWT verifier used by `/api/me`, `/api/purchases/checkout`, etc. |
| `Content-Type` | `application/json` |

```json
{
  "reason": "optional free-form string, max 1000 chars"
}
```

### Response

| Status | Body | Meaning |
|---|---|---|
| 200 | `{}` or `{"ok": true}` | Deletion scheduled; user signed out client-side next |
| 401 | `{"error": "Unauthorized"}` | Missing/invalid bearer |
| 410 | `{"error": "Already deleted"}` | Idempotent — user re-clicked |
| 503 | `{"error": "Try again later"}` | Transient downstream failure |

### What "delete" means server-side

1. **Soft-delete the user row** (`users.deleted_at = NOW()`). Do not hard-delete — needed for invoice retention.
2. **Anonymise PII** in the user row: clear `display_name`, `email`, `avatar_url`, `bio`, replace with `(deleted user)` / null.
3. **Revoke OAuth refresh tokens**: delete rows from `google_oauth_tokens` (Calendar) and any other connected-provider tables.
4. **Mark uploaded content for removal**: set `guides.deleted_at` for all guides authored by this user (separate batch can hard-delete from GCS within 30 days).
5. **Cancel any pending purchases** (rare — most purchases settle within minutes anyway).
6. **Log a row to `account_deletions` audit table** with: user id, reason, timestamp, source = `INAPP`.
7. **Queue a job for 30-day backup purge** — the privacy policy promises that retention window. Use whatever job scheduler you already have (e.g., a daily cron that hard-deletes rows where `deleted_at < NOW() - INTERVAL '30 days'`).
8. **Send confirmation email** to the user's now-anonymised-but-recorded email address: "Your Brooks account has been deleted. Backup copies are purged within 30 days."

### Idempotency & race conditions

- Multiple POSTs from the same user (e.g. user double-clicks): return 200 each time after the first; do not re-process.
- Concurrent purchase events arriving for a just-deleted user: reject with 410 in `/api/purchases/*` after deletion.

---

## Endpoint 2 — Public unauthenticated deletion request

`POST /api/account/delete-request`

This is the URL Play Console requires for users who have lost access (lost password, lost device, etc.) — they must be able to delete without signing in.

### Request

| Header | Value |
|---|---|
| `Content-Type` | `application/json` |

```json
{
  "email": "user@example.com",
  "reason": "optional"
}
```

### Response

Always return **200 OK** with `{}`. NEVER reveal whether an account exists — that would be an account-enumeration vulnerability.

### Server-side behaviour

1. **Validate email shape** — reject malformed addresses silently (still respond 200).
2. **Rate limit** — at most 5 requests per hour per IP, 3 per day per email. Helps mitigate spam.
3. **If a user with this email exists**:
   - Generate a one-time confirmation token (random, 32 bytes, base64url).
   - Store in `account_deletion_requests` table: `(token, user_id, expires_at NOW()+48h, used_at NULL)`.
   - Email the user a link: `https://brooksweb.uk/account/delete/confirm?token=<token>`.
4. **If no user with this email exists**: silently drop the request. Do not send any email.

The frontend already returns 200 unconditionally regardless of upstream status — this is intentional account-enumeration defence. Spring should NOT return 404 for missing users; it should also return 200 silently.

---

## Endpoint 3 (new — not yet on frontend) — Confirmation link target

`GET /api/account/delete/confirm?token=<token>` → web route that completes deletion

When the user clicks the email link, the request hits a route that:
1. Looks up the token in `account_deletion_requests`.
2. Rejects if `used_at` is set or `expires_at` is past — render "Link expired" page.
3. Otherwise performs the same deletion sequence as Endpoint 1, marks `used_at = NOW()`.
4. Renders a "Deletion confirmed" page.

Frontend route to add later: `web/src/app/account/delete/confirm/page.tsx` — server component that reads `?token=...` and calls this endpoint. Out of scope for this session; can add when backend is ready.

---

## Database schema additions

```sql
-- One row per submitted public deletion request. Soft-delete handled separately.
CREATE TABLE account_deletion_requests (
  token        VARCHAR(64) PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES users(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ NOT NULL,
  used_at      TIMESTAMPTZ,
  source_ip    INET,
  user_agent   TEXT,
  CONSTRAINT account_deletion_requests_expires_chk CHECK (expires_at > requested_at)
);
CREATE INDEX account_deletion_requests_user_id_idx ON account_deletion_requests(user_id);
CREATE INDEX account_deletion_requests_expires_idx ON account_deletion_requests(expires_at);

-- Audit table — survives the user row's soft-delete + 30-day purge.
CREATE TABLE account_deletions (
  id                BIGSERIAL PRIMARY KEY,
  user_id           UUID NOT NULL,
  hashed_email      TEXT NOT NULL,            -- sha256 for de-dup, no plaintext after purge
  reason            TEXT,
  source            VARCHAR(8) NOT NULL,       -- 'INAPP' | 'WEB' | 'SUPPORT'
  requested_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hard_deleted_at   TIMESTAMPTZ                -- set when 30-day backup purge runs
);
CREATE INDEX account_deletions_requested_idx ON account_deletions(requested_at);
```

---

## Spring code sketch (rough, adjust to project conventions)

```java
@RestController
@RequestMapping("/api/account")
public class AccountDeletionController {

  private final AccountDeletionService service;
  private final RateLimiter rateLimiter;

  @PostMapping("/delete")
  public ResponseEntity<?> deleteAuthenticated(
      @RequestBody(required = false) DeleteAccountRequest body,
      @AuthenticationPrincipal Jwt jwt
  ) {
    UUID userId = UUID.fromString(jwt.getSubject());  // adjust to your claim
    service.deleteUser(userId, body == null ? null : body.reason(), DeletionSource.INAPP);
    return ResponseEntity.ok(Map.of("ok", true));
  }

  @PostMapping("/delete-request")
  public ResponseEntity<?> deleteRequestPublic(
      @RequestBody DeleteRequestBody body,
      HttpServletRequest req
  ) {
    if (!rateLimiter.allow(req.getRemoteAddr(), "delete-request")) {
      return ResponseEntity.ok(Map.of()); // silent OK on rate-limit too
    }
    service.queueDeleteRequest(body.email(), body.reason(), req.getRemoteAddr());
    return ResponseEntity.ok(Map.of());
  }
}
```

---

## Testing the round-trip

After Spring side is live:

1. **Authenticated flow:**
   - Sign in to brooksweb.uk
   - Navigate to Settings → Delete account
   - Fill confirmation phrase → Submit
   - Backend should receive POST with bearer token
   - User row should be soft-deleted
   - Auth0 session cleared by frontend's `setTimeout(() => router.push('/api/auth/logout'), 4000)`

2. **Public flow:**
   - Open `/account/delete` in incognito (no session)
   - Enter the email of a known test account
   - Submit → response 200, "Check your email" UI
   - Backend should have stored a row in `account_deletion_requests`
   - Email should arrive at the test address with the confirmation link

3. **Negative: nonexistent email:**
   - Same flow with an email that has no account
   - Frontend still shows "Check your email" (defence-in-depth)
   - Backend should NOT send an email
   - No row in `account_deletion_requests`

---

## Why Play Console cares

Per Google Play policy (active since 2024, reinforced April 15 2026):
> If your app enables app account creation, you must also provide an option to initiate the deletion of the user's account and associated data from within the app, and provide further information online for users including, where possible, an option to initiate the same deletion process outside of the app.

Both must work end-to-end. Reviewer tests both. Until Spring side ships, the Play Store reviewer will fail your submission with the standard "policy issue: account deletion" rejection.
