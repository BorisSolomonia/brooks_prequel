# Bank of Georgia (BOG) iPay — Payment & Unlock System

> A complete, build-from-zero guide to how Brooks takes money with **Bank of Georgia iPay**,
> unlocks a purchased guide for the buyer, pays creators, and stays secure — plus every bug we hit
> and exactly how it was fixed. If you read this top to bottom you can rebuild the whole flow from
> scratch.

---

## 0. The one-paragraph mental model

A buyer clicks **Buy** → we ask BOG to create an **order** → BOG gives us a **payment page URL** → the
buyer pays there → BOG tells us "paid" two ways: a **webhook** (server-to-server) and a **redirect**
back to our success page. We **never trust those messages blindly** — we re-ask BOG "is this order
really paid?" via the **Payment Details API**, and only then do we mark the purchase complete and
**unlock** the guide. Unlocking = creating a **"trip"** row that the app checks for access. Creators
are paid out **manually** from a ledger we keep; no money moves to creators automatically.

---

## 1. Vocabulary (learn these 5 words first)

| Term | What it is |
|------|-----------|
| **Order** | BOG's record of one payment attempt. BOG owns its id (`bog_order_id`). |
| **`external_order_id` (a.k.a. `shop_order_id`)** | OUR id for the checkout, which we generate and send to BOG. BOG echoes it back in the redirect URL. |
| **Callback / webhook** | A signed server-to-server POST from BOG telling us an order's status changed. |
| **Payment Details / receipt** | A BOG API we call to get the *authoritative* status of an order. |
| **Trip (`guide_purchases` row)** | The thing that actually grants a buyer access to a guide. Created when a purchase is verified-paid. |

> ⚠️ **The single most important fact:** in this codebase there are **two** "purchase" tables.
> `purchases` = the **payment record** (money). `guide_purchases` = the **access/"trip"** record
> (unlock). A buyer only sees the guide unlocked when a `guide_purchases` row exists. Completing the
> payment and granting access are **two separate steps**, and most of our bugs lived in the gap
> between them.

---

## 2. Architecture

### 2.1 Components (backend, `backend/purchase` + `backend/guide`)

```
            ┌─────────────────────────── BROWSER / APP ───────────────────────────┐
            │  BuyButton → /checkout      success page → /verify      view page → /ensure-access
            └───────────────┬───────────────────┬────────────────────────┬────────┘
                            │                   │                        │
                    ┌───────▼───────────────────▼────────────────────────▼─────────┐
                    │                 PurchaseController (REST)                      │
                    └───────┬───────────────────┬────────────────────────┬─────────┘
                            │                   │                        │
                    ┌───────▼─────────┐  ┌──────▼────────┐       ┌────────▼─────────┐
                    │ PurchaseService │  │ Webhook       │       │ Reconciliation   │
                    │ create / verify │  │ Controller    │       │ Job (@Scheduled) │
                    │ / fulfill       │  │ (signed)      │       │ sweeps PENDING + │
                    └───┬─────────┬───┘  └──────┬────────┘       │ COMPLETED        │
                        │         │             │                └────────┬─────────┘
                        │         │             │                         │
              ┌─────────▼──┐  ┌───▼─────────────▼───┐         ┌───────────▼───────────┐
              │ BogIpayClient│ │ BogCallbackVerifier │         │ GuidePurchaseService  │
              │ OAuth+REST   │ │ RSA signature check │         │ materializeTrip (unlock)│
              └──────┬───────┘ └─────────────────────┘         └───────────────────────┘
                     │
        ┌────────────▼─────────────┐
        │  BOG iPay (api.bog.ge)    │
        │  oauth2.bog.ge (token)    │
        └───────────────────────────┘
```

Key classes:

| Class | Responsibility |
|-------|---------------|
| `BogIpayClient` | OAuth token (cached), createOrder, getPaymentDetails (receipt), refund. Owns all HTTP to BOG. |
| `BogCallbackVerifier` | Verifies the `Callback-Signature` (SHA256withRSA) on webhooks with BOG's public key. |
| `WebhookController` | `POST /api/webhooks/bog-ipay` — verifies signature, dispatches by `order_status.key`. |
| `PurchaseService` | Two-phase checkout, verified completion, verify-on-return, self-heal access. |
| `PurchaseQueryService` | Read APIs (my purchases, by shop order). |
| `PurchaseReconciliationJob` | `@Scheduled` safety-net sweep (re-verify PENDING; trip-check COMPLETED). |
| `CreatorEarningsRecorder` | Writes the immutable `creator_earnings` ledger; reverses on refund. |
| `GuidePurchaseService.materializeTripForPurchase` | Creates the `guide_purchases` "trip" = the unlock. |
| `BogIpayProperties` | All config (`bog-ipay.*`). |

### 2.2 Database tables

- **`purchases`** — one row per checkout. `status` ∈ `PENDING | COMPLETED | REFUNDED | FAILED`. Holds
  `bog_order_id` (BOG's id), `external_order_id` (ours), `price_cents_paid`, `currency`,
  `platform_fee_cents`, `commission_rate_bps`, `completed_at`.
- **`guide_purchases`** — the buyer's owned guide / "trip". Existence (with `removed_at IS NULL`) = access.
- **`guide_versions`** — JSON snapshot of the guide at the version purchased. A trip is built from this.
- **`creator_earnings`** — per-sale ledger: gross / commission / net / `payout_status`.

---

## 3. The full payment → unlock lifecycle

```
1. Buyer clicks Buy
   → POST /api/purchases/checkout {guideId}
   → PurchaseService.createCheckout:
        (a) free-guide shortcut (FREE_PUBLIC / FREE_FOR_FOLLOWERS) → unlock immediately, done.
        (b) preflight (read-only): eligibility, not-own-guide, not-already-owned, GEL-only, price.
            Generates external_order_id = random UUID.
        (c) BogIpayClient.createOrder(...)  ← HTTP to BOG, NO db txn held across it
        (d) persist `purchases` row = PENDING, bog_order_id + external_order_id stored.
   → returns { checkoutUrl = BOG payment page, orderId }
2. Browser redirects to checkoutUrl (payment.bog.ge). Buyer pays.
3. BOG notifies us TWICE (either/both may arrive, in any order, or be lost):
   (A) Webhook  → POST /api/webhooks/bog-ipay  (signed)
   (B) Redirect → /purchases/success?shop_order_id=<external_order_id>
4. Fulfillment (idempotent, runs from webhook OR success-page verify OR the sweep):
   → re-fetch BOG **Payment Details** for the order
   → verify status == "completed" AND amount AND currency match what we stored
   → atomic markCompletedIfPending  (purchases → COMPLETED)
   → write creator_earnings ledger row
   → materialize the **trip** (guide_purchases) ← THE UNLOCK
5. Access check (view page): GET /api/me/trips/by-guide/{guideId}
   → trip exists & not removed → "buyer" mode (unlocked)
   → 404 → call POST /api/me/purchases/by-guide/{guideId}/ensure-access (self-heal) then retry
```

### Three independent unlock triggers (defence in depth)
1. **Webhook** — fast path, server-to-server.
2. **Verify-on-return** — success page `POST .../verify` re-checks BOG and fulfills. Saves you when the
   webhook is lost or misreported.
3. **Reconciliation sweep** — `@Scheduled` job re-verifies `PENDING` orders and trip-checks recent
   `COMPLETED` orders. Catch-all so nothing stays charged-but-locked.

All three call the **same verified, idempotent** completion path. Running them all is safe.

---

## 4. The BOG API — exact integration details

### 4.1 Authentication (OAuth2 client credentials)
```
POST https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token
Authorization: Basic base64(client_id ":" client_secret)
Content-Type: application/x-www-form-urlencoded
Body: grant_type=client_credentials
→ { "access_token": "...", "expires_in": 3600, ... }
```
Cache the token until `expires_in - 60s`. Use it as `Authorization: Bearer <token>` on all calls.

### 4.2 Create order
```
POST https://api.bog.ge/payments/v1/ecommerce/orders
Authorization: Bearer <token>
Content-Type: application/json
Accept: application/json        ← ⚠️ MANDATORY (see Bug #3)
Accept-Language: ka|en
Idempotency-Key: <a UUID>       ← ⚠️ must be UUID format (see Bug #2)
{
  "callback_url": "https://<APP_BASE_URL>/api/webhooks/bog-ipay",
  "external_order_id": "<our shop_order_id>",
  "application_type": "web",
  "capture": "automatic",
  "purchase_units": {
    "currency": "GEL",
    "total_amount": 12.34,                 ← ⚠️ JSON NUMBER, not "12.34" (see Bug #1)
    "basket": [ { "product_id": "<guideId>", "quantity": 1, "unit_price": 12.34 } ]
  },
  "redirect_urls": {
    "success": "https://<FRONTEND>/purchases/success?shop_order_id=<our id>",
    "fail":    "https://<FRONTEND>/purchases/failed?shop_order_id=<our id>"
  },
  "ttl": 30
}
→ 201 { "id": "<bog_order_id>", "_links": { "redirect": { "href": "https://payment.bog.ge?order_id=..." }, "details": { "href": ".../receipt/..." } } }
```
Send the buyer to `_links.redirect.href`. Store `id` as `bog_order_id`.

### 4.3 Payment Details (the source of truth)
```
GET https://api.bog.ge/payments/v1/receipt/{bog_order_id}
Authorization: Bearer <token>
Accept: application/json
→ { "order_id", "external_order_id",
    "order_status": { "key": "completed", ... },
    "purchase_units": { "request_amount": "12.34", "transfer_amount": "12.34", "currency_code": "GEL" },  ← ⚠️ amounts are STRINGS here
    "payment_detail": { "transfer_method": {"key":"card"}, "transaction_id", "auth_code", ... } }
```
`order_status.key` values: `created, processing, completed, rejected, refunded, refunded_partially,
auth_requested, blocked, partial_completed`.

> ⚠️ **Amount asymmetry:** the **request** (create order) wants JSON **numbers**; the **response**
> (receipt) returns **strings**. Serialize one way, parse the other.

### 4.4 Refund
```
POST https://api.bog.ge/payments/v1/payment/refund/{bog_order_id}
Authorization: Bearer <token>
Content-Type: application/json
Accept: application/json
{ "amount": 12.34 }     ← omit for a full refund; JSON number when present
```

### 4.5 Webhook (callback)
- BOG `POST`s JSON to your `callback_url`.
- Header **`Callback-Signature`** = base64( **SHA256withRSA** signature of the raw body ), verified with
  BOG's **public key** (shipped at `backend/purchase/src/main/resources/bog/callback-public-key.pem`).
- Body shape:
  ```
  { "event": "order_payment", "zoned_request_time": "...", "body": { ...same shape as receipt... } }
  ```
- **Verify the signature on the RAW bytes before parsing.** Reject if missing/invalid (HTTP 400).
- Return **HTTP 200** once handled; return 5xx to make BOG retry. Be idempotent — BOG re-delivers.

---

## 5. Security model (do all of these)

1. **Verify the webhook signature** (SHA256withRSA, raw body, BOG public key). Reject unsigned/forged.
2. **Never trust the callback body or the client.** Always re-fetch **Payment Details** from BOG and
   confirm `order_status.key == "completed"` **before** unlocking.
3. **Reconcile amount + currency** from the receipt against the values you stored at checkout. Any
   mismatch → do not complete; audit it.
4. **Atomic, idempotent completion** — `UPDATE ... SET status=COMPLETED WHERE id=? AND status=PENDING`
   so duplicate deliveries can't double-fulfill.
5. **Idempotency-Key** on create/refund so BOG dedupes retries.
6. **Access is per-buyer** — `ensure-access` / receipt endpoints only act on the authenticated buyer's
   own purchase.
7. **A charge BOG does NOT confirm as paid is never unlocked** — it stays PENDING/FAILED and is
   audited/flagged for manual refund or review.
8. **Secrets** (`BOG_IPAY_CLIENT_ID/SECRET_KEY`) live only in the secrets manager / `.env.runtime`,
   never in git. The callback **public** key is safe to ship.

---

## 6. Configuration & environment variables

`application.yml` → `bog-ipay.*` (backed by `BogIpayProperties`):

| Property | Env var | Default |
|----------|---------|---------|
| `bog-ipay.client-id` | `BOG_IPAY_CLIENT_ID` 🔒 | — (required) |
| `bog-ipay.secret-key` | `BOG_IPAY_SECRET_KEY` 🔒 | — (required) |
| `bog-ipay.oauth-base-url` | `BOG_IPAY_OAUTH_URL` | `https://oauth2.bog.ge` |
| `bog-ipay.api-base-url` | `BOG_IPAY_API_URL` | `https://api.bog.ge` |
| `bog-ipay.callback-path` | `BOG_IPAY_CALLBACK_PATH` | `/api/webhooks/bog-ipay` |
| `bog-ipay.locale` | `BOG_IPAY_LOCALE` | `ka` |
| `bog-ipay.order-ttl-minutes` | `BOG_IPAY_ORDER_TTL_MINUTES` | `30` |
| (reconcile interval) | `bog-ipay.reconcile-interval-ms` | `300000` |
| backend public URL | `APP_BASE_URL` | must be public HTTPS (BOG must reach the callback) |
| frontend URL | `FRONTEND_BASE_URL` | must be public HTTPS (redirect targets) |

> 🔴 **Most common deploy mistake:** leaving `APP_BASE_URL` at `http://localhost:8080`. Then
> `callback_url` points at localhost, BOG can't reach it, and the webhook never arrives. Set it to your
> real public HTTPS URL.

---

## 7. War stories — every bug we hit, and the fix

These are real; each cost a debugging cycle. Learn from them.

| # | Symptom | Root cause | Fix |
|---|---------|-----------|-----|
| 1 | Create-order amounts rejected / fragile | We sent `total_amount`/`unit_price` as **strings** (`"12.34"`) | BOG's create schema wants JSON **numbers** → serialize a `BigDecimal` (scale 2). (Receipt amounts ARE strings — parse those as strings.) |
| 2 | Idempotency unreliable | `Idempotency-Key` was `"create:<id>"`, not a UUID | Emit a deterministic **UUID** (`UUID.nameUUIDFromBytes(logicalKey)`). |
| 3 | `Unexpected character ('<')` on create | BOG **defaults to XML**; we never set `Accept` → got `<EntityModel>…` and tried to JSON-parse it | Send **`Accept: application/json`** on every BOG call. Added a `requireJsonBody()` guard that logs status+content-type+body on any non-JSON/non-2xx response. |
| 4 | `invalid_client` 401/400 from OAuth | `BOG_IPAY_CLIENT_ID/SECRET_KEY` were still the placeholder strings in the deployed env | Put **real** credentials in `.env.runtime`; verify with a token curl. |
| 5 | Checkout 400 "not priced in GEL" | Demo guide was priced **USD**; BOG here is **GEL-only** | GEL-only end-to-end: force GEL on create/edit + seed; the demo guide is GEL. |
| 6 | Place save 400 `Cannot deserialize Integer from "MID_RANGE"` | AI panel sent `priceLevel` as a **label string**; DTO is `Integer` | Map label→`1..4` on the client before sending. |
| 7 | `/api/memories/map` 400 "Invalid map bounds" | Leaflet returns world-wrapped longitudes (>180) when zoomed out | Clamp lat/lng to `[-90,90]`/`[-180,180]` client-side. |
| 8 | Success page "Purchase not found" | Page looked up by `shop_order_id` (our id) against the `bog_order_id` column | Persist `external_order_id` (migration V57) + look up by it (`/by-shop-order`). |
| 9 | **Charged, but order shows `rejected`** → never unlocked | Unlock was gated **only** on the webhook saying `completed`, but BOG delivered `rejected` after capturing money | **Verify-on-return + reconcile**: re-fetch Payment Details and fulfill on verified status, not on the callback alone. Added `rejected → FAILED` handling. |
| 10 | **Paid + COMPLETED, but guide still locked** ("Buy" button) | Access = a `guide_purchases` **trip** row; trip materialization runs in an `AFTER_COMMIT` listener whose exceptions were **swallowed**, and nothing re-tried it. The reconcile job only swept `PENDING`. | Idempotent **self-heal**: `ensure-access-by-guide` (called by the view page on open) + reconcile sweep now also trip-checks recent `COMPLETED`. Restore `removed_at` on re-purchase. |
| 11 | Refund didn't reverse creator earnings | `handleCheckoutRefunded` never touched `creator_earnings` | On refund, reverse the ledger row (`REVERSED` / `CLAWBACK_DUE` / `REVIEW`). |

**Meta-lessons:**
- Treat the **callback as a hint, the Payment Details API as the truth.**
- **Completion ≠ unlock** — they're separate writes; make the second one self-healing, never
  fire-and-forget with swallowed errors.
- A 2xx response can still be the wrong **content type** — guard your JSON parsing.
- "It's deployed" — verify with the **Flyway schema version**, not assumptions.

---

## 8. Build it from zero (step by step)

> Assumes a Spring Boot backend + a JS frontend + Postgres, like Brooks. Adapt names freely.

**Step 1 — Get BOG credentials.** Register as an iPay merchant; get `client_id` + `client_secret` and
your **production** callback public key. Put creds in your secrets manager.

**Step 2 — Config.** Add `bog-ipay.*` properties (Section 6). Set `APP_BASE_URL` (public HTTPS) and
`FRONTEND_BASE_URL`. Ship the callback public key as a resource.

**Step 3 — HTTP client.** Implement `BogIpayClient`:
- `ensureToken()` — POST to the OAuth URL with Basic auth, cache the token.
- `createOrder(...)` — POST `/payments/v1/ecommerce/orders` with `Accept: application/json`, numeric
  amounts, UUID `Idempotency-Key`. Return `id` + `_links.redirect.href`.
- `getPaymentDetails(orderId)` — GET `/payments/v1/receipt/{id}` with `Accept: application/json`; parse
  string amounts.
- `refund(orderId, amount?)`.
- Wrap every response in a `requireJsonBody()` guard (log status/content-type/snippet, fail clearly).

**Step 4 — Checkout.** `POST /checkout`:
1. preflight (eligibility, price, currency) and generate `external_order_id` (UUID);
2. `createOrder(...)`;
3. persist a `PENDING` purchase with `bog_order_id` + `external_order_id`;
4. return the redirect URL. Send the browser there.

**Step 5 — Webhook.** `POST /api/webhooks/bog-ipay`:
1. read **raw body**, verify `Callback-Signature` (SHA256withRSA, public key) — reject if bad;
2. parse JSON; if `event == order_payment` and `order_status.key == completed` → run the **verified
   completion** path (Step 7); handle `rejected`/`refunded` too;
3. return 200 (5xx to force retry). Be idempotent.

**Step 6 — Verified completion (the heart).** Given a `bog_order_id`:
1. `getPaymentDetails` → require `order_status.key == completed`;
2. reconcile **amount + currency** against the stored purchase;
3. atomic `UPDATE ... SET status=COMPLETED WHERE status=PENDING`;
4. write the earnings ledger row;
5. **materialize the access record** (your "trip"/entitlement) — idempotent.

**Step 7 — Unlock + access.** Access = the entitlement row exists. On the guide page, if it's missing
but the buyer has a COMPLETED purchase, call **`ensure-access`** (re-run materialize) then re-check —
so a paid item unlocks on open.

**Step 8 — Return page.** `success?shop_order_id=...` → `POST /by-shop-order/{id}/verify` which re-runs
Step 6 (so the buyer's return alone fulfills, even if the webhook was lost). Poll until COMPLETED.

**Step 9 — Reconcile job.** `@Scheduled` every few minutes: re-verify `PENDING` orders (aged 2 min–24 h)
and trip-check recent `COMPLETED` orders. The safety net.

**Step 10 — Refund + payout ledger.** On refund callback, set the purchase `REFUNDED` and **reverse the
earnings row**. Pay creators from the `PENDING` earnings (manual bank transfer), then mark `PAID`.

**Step 11 — Admin visibility.** A `GET /api/admin/transactions` (+ CSV) joining purchase + guide + both
parties + earnings + payout details, for reconciliation and disputes.

---

## 9. Testing & diagnostics (copy-paste)

**Verify credentials (token):**
```
TOKEN=$(curl -s -u "$BOG_IPAY_CLIENT_ID:$BOG_IPAY_SECRET_KEY" -d grant_type=client_credentials \
  https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
echo "$TOKEN" | head -c 20    # non-empty = creds OK
```

**Check a real order's authoritative status:**
```
curl -s -H "Authorization: Bearer $TOKEN" -H "Accept: application/json" \
  https://api.bog.ge/payments/v1/receipt/<bog_order_id> | head -c 1500
```

**Inspect the DB (inside the Postgres container, using its own creds):**
```
docker exec brooks-postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At \
 -c "SELECT version FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 1;" \
 -c "SELECT id,guide_id,guide_version_number,status,bog_order_id,completed_at FROM purchases ORDER BY created_at DESC LIMIT 6;" \
 -c "SELECT id,guide_id,status,removed_at FROM guide_purchases ORDER BY created_at DESC LIMIT 6;" \
 -c "SELECT guide_id,version_number FROM guide_versions ORDER BY guide_id;"'
```
- A `purchases` row `COMPLETED` with **no matching `guide_purchases`** = unlock gap → `ensure-access`
  / reconcile should heal it.

**Look for materialize/fulfillment errors:**
```
docker logs brooks-backend 2>&1 | grep -iE "materialize|ensure trip|guide snapshot|requireJsonBody|reconcile" | tail -40
```

---

## 10. File map (where to look)

```
backend/purchase/src/main/java/com/brooks/purchase/
  service/BogIpayClient.java            ← OAuth, createOrder, receipt, refund (Accept: json, numeric amounts, UUID idemp.)
  service/BogCallbackVerifier.java      ← SHA256withRSA signature check
  service/PurchaseService.java          ← checkout, verified completion, verify-on-return, ensure-access
  service/PurchaseReconciliationJob.java← @Scheduled sweep (PENDING + COMPLETED)
  service/CreatorEarningsRecorder.java  ← earnings ledger + refund reversal
  service/AdminTransactionService.java  ← admin transaction log query + CSV
  api/PurchaseController.java           ← /checkout, /by-shop-order/{id}, /verify, /by-guide/{id}/ensure-access
  api/WebhookController.java            ← /api/webhooks/bog-ipay
  api/AdminTransactionController.java   ← /api/admin/transactions (+ export.csv)
  service/BogIpayProperties.java        ← bog-ipay.* config
  resources/bog/callback-public-key.pem ← BOG public key (safe to ship)
backend/guide/src/main/java/com/brooks/guide/
  service/GuidePurchaseService.java     ← materializeTripForPurchase = THE UNLOCK; getTripByGuide = access
  event/GuidePurchaseEventListener.java ← AFTER_COMMIT trip materialization (fast path)
backend/app/src/main/resources/db/migration/
  V57__purchases_external_order_id.sql  ← external_order_id column
web/src/
  components/ui/BuyButton.tsx           ← starts checkout
  app/(app)/purchases/success/page.tsx  ← verify-on-return
  app/(app)/guides/[id]/view/page.tsx   ← owner/buyer/preview + ensure-access self-heal
  app/admin/transactions/page.tsx       ← admin transaction log UI
```

---

## 11. Golden rules (pin these above your desk)

1. **Payment Details API is truth. Callbacks and clients are hints.**
2. **Verify status + amount + currency before unlocking. Never unlock an unconfirmed charge.**
3. **Completion and unlock are two writes — make the unlock idempotent and self-healing.**
4. **Three triggers, one verified path:** webhook + return-verify + reconcile sweep.
5. **`Accept: application/json` on every BOG call. Numbers in requests, strings in the receipt.**
6. **Idempotency-Key = UUID. Atomic `PENDING→COMPLETED`.**
7. **Real secrets + real public `APP_BASE_URL` in the secrets manager — verify the Flyway version after deploy.**
