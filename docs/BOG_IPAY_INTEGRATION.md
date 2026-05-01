# Bank of Georgia iPay — Integration Guide

A complete, standalone guide to integrating **Bank of Georgia iPay** (`https://api.bog.ge/docs/en/ipay/`) into a server-side application. The Java/Spring code samples are taken from the Brooks Prequel reference implementation, but the design and security patterns translate directly to Node.js, Python, Go, or any other backend.

This document covers what the official BOG documentation glosses over: **token caching, callback verification (callbacks are unsigned), idempotent webhook handling, and how to wire prices in minor units without floating-point drift.**

---

## Table of contents

1. [What BOG iPay is and is not](#1-what-bog-ipay-is-and-is-not)
2. [Prerequisites and account setup](#2-prerequisites-and-account-setup)
3. [Architecture overview](#3-architecture-overview)
4. [Authentication](#4-authentication)
5. [Create order (start a payment)](#5-create-order-start-a-payment)
6. [Get payment details (verify status)](#6-get-payment-details-verify-status)
7. [Refunds](#7-refunds)
8. [Callbacks (webhooks) — including the unsigned-callback problem](#8-callbacks-webhooks)
9. [Pre-authorization (optional)](#9-pre-authorization-optional)
10. [Recurring payments (optional)](#10-recurring-payments-optional)
11. [Reference implementation map](#11-reference-implementation-map)
12. [Environment variables](#12-environment-variables)
13. [Testing](#13-testing)
14. [Troubleshooting](#14-troubleshooting)
15. [Security checklist](#15-security-checklist)

---

## 1. What BOG iPay is and is not

| Feature | Supported | Notes |
|---|---|---|
| One-time card payments (Visa, Mastercard, Amex) | ✅ | Through BOG-issued or any commercial-bank-issued card |
| Refunds (full or partial) | ✅ | Cannot be cancelled once issued |
| Pre-authorization (hold funds, capture later) | ✅ | Up to 30-day hold |
| Recurring payments | ✅ | Must be enabled by BOG support; requires a "parent" 0.10 GEL transaction |
| Apple Pay / Google Pay | ❌ | Not in the iPay docs (BOG offers these via separate products) |
| Currencies other than GEL | ❌ | **GEL only**, all amounts in tetri (1 GEL = 100 tetri) |
| Callback signatures | ❌ | **No signature mechanism is documented** — see §8 for the mitigation |
| Sandbox environment | ❓ | Not mentioned in the public docs; ask BOG support |

If your application needs anything in the ❌ rows, plan accordingly before committing to iPay.

---

## 2. Prerequisites and account setup

To accept payments through iPay you need a **BOG business account** and a registered iPay merchant profile.

### Steps to obtain credentials

1. **Open a Bank of Georgia business account** (in Georgia). You'll get access to [`businessonline.ge`](https://businessonline.ge).
2. **Apply for iPay** through your business banker or via the businessonline portal. The bank's onboarding will ask for:
   - Company profile information (legal name, registration number, address)
   - Business type and expected transaction volume
   - **Callback URLs** — both the payment-status callback and the refund callback. You must give the bank these URLs in writing; they are configured server-side at BOG, not by you.
3. **Receive credentials**: BOG issues a `client_id` and a `secret_key`. Per the docs, the `secret_key` **cannot be changed by the merchant**, so store it securely (Secret Manager / Vault).
4. **Initial state is "pending mode"**: until the callback URLs are configured by BOG, your account is blocked. You can authenticate but cannot create live orders.
5. **Submit iPay parameters** to the bank in digital format. They handle final activation.

### What you provide to BOG (as URLs)

Field | Example for the reference app
--- | ---
Payment status callback URL | `https://yourdomain.com/api/webhooks/bog-ipay`
Refund callback URL | Same endpoint (this guide handles both events on one route)
Redirect URL after successful payment | `https://yourdomain.com/purchases/return?shop_order_id={SHOP_ORDER_ID}`

> Plan the callback URL **before** you submit it to BOG. Changing it later requires a new bank request.

---

## 3. Architecture overview

```
+-----------+      1. createOrder       +-----------+   2. POST /checkout/orders   +-----------+
|  Browser  |  ---------------------->  |  Backend  |  ------------------------->  | BOG iPay  |
+-----------+                           +-----------+                              +-----------+
      |                                       |                                          |
      |                                       |  <--- 3. {order_id, payment_hash,        |
      |                                       |        approve link} -----------------   |
      |   <---- 4. redirect to approve link --|                                          |
      |                                                                                  |
      | ---- 5. user completes payment in BOG iPay UI ---------------------------------> |
      |                                                                                  |
      |   <---- 7. redirect_url (frontend)                                               |
      |                                                                                  |
      |                                       |   <-- 6. POST callback (form-urlencoded) |
      |                                       |        order_id, payment_hash, status    |
      |                                       |                                          |
      |                                       |  ---  GET /checkout/payment/{order_id}-> |
      |                                       |  <--- {status, payment_hash, ...} ---    |
      |                                       |                                          |
      |                                  8. verify hash, mark purchase COMPLETED          |
```

Key invariants:

- **`order_id`** is the BOG-issued payment identifier. Use it for status lookups and refunds.
- **`shop_order_id`** is your application's identifier. Include it in `createOrder` so it appears in your bank statement and the callback.
- **`payment_hash`** is returned at order creation. Store it. Compare it on every callback to defend against forged callbacks.
- **The callback is informational, not authoritative.** Always re-verify by calling `getPaymentDetails` before changing your DB state.

---

## 4. Authentication

OAuth 2.0 client credentials flow. One token serves all subsequent calls until it expires.

### Endpoint

```
POST {BASE_URL}/oauth2/token
Content-Type: application/x-www-form-urlencoded
Authorization: Basic base64({client_id}:{secret_key})
```

Body:

```
grant_type=client_credentials
```

### Successful response

```json
{
  "access_token": "eyJraWQi...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

> The official docs do not document `expires_in` explicitly, but JWT-bearing OAuth 2.0 servers always return it. **Cache the token** until ~60 seconds before expiry to avoid one network round-trip per API call.

### Reference implementation (Java)

```java
private synchronized String ensureToken() {
    if (cachedToken != null && Instant.now().isBefore(cachedTokenExpiresAt)) {
        return cachedToken;
    }
    String basic = Base64.getEncoder().encodeToString(
            (clientId + ":" + secretKey).getBytes(StandardCharsets.UTF_8));
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
    headers.set(HttpHeaders.AUTHORIZATION, "Basic " + basic);

    MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
    form.add("grant_type", "client_credentials");

    ResponseEntity<String> response = restTemplate.postForEntity(
            baseUrl + "/oauth2/token",
            new HttpEntity<>(form, headers),
            String.class);
    JsonNode json = mapper.readTree(response.getBody());
    cachedToken = json.get("access_token").asText();
    int expiresInSeconds = json.has("expires_in") ? json.get("expires_in").asInt(3600) : 3600;
    cachedTokenExpiresAt = Instant.now().plusSeconds(Math.max(60, expiresInSeconds - 60));
    return cachedToken;
}
```

### Error responses

The docs don't enumerate auth errors. Empirically you'll see:

- `401 invalid_client` — wrong `client_id` or `secret_key`
- `400 unsupported_grant_type` — anything other than `client_credentials`
- `403` — account not activated for iPay yet (still in "pending mode")

---

## 5. Create order (start a payment)

Creates an order and returns a redirect URL the user must visit to complete payment.

### Endpoint

```
POST {BASE_URL}/checkout/orders
Authorization: Bearer {access_token}
Content-Type: application/json
```

### Request fields

Required:

| Field | Type | Description |
|---|---|---|
| `intent` | enum | `CAPTURE` (charge immediately) or `AUTHORIZE` (hold for later capture; pre-auth flow) |
| `items` | array | Product line items |
| `items[].amount` | string | Per-item price as `"NN.NN"` (GEL with 2 decimals) |
| `items[].description` | string | Shown on the iPay UI; first 25 chars appear on bank statement |
| `items[].quantity` | string | Quantity as a string (per docs) |
| `items[].product_id` | string | Your internal product id |
| `redirect_url` | string | Where iPay sends the user after they finish (success or fail) |
| `purchase_units` | array | One element with the total |
| `purchase_units[].amount.currency_code` | enum | `"GEL"` only |
| `purchase_units[].amount.value` | string | Total as `"NN.NN"` |

Optional:

| Field | Default | Description |
|---|---|---|
| `locale` | — | `"ka"` (Georgian) or `"en-US"` (English) |
| `shop_order_id` | — | Your internal order id; appears in callback |
| `show_shop_order_id_on_extract` | `false` | If true, prefixes bank statement with shop_order_id |
| `capture_method` | `AUTOMATIC` | `AUTOMATIC` charges immediately; `MANUAL` reserves for up to 30 days (pre-auth) |

### Example request

```json
{
  "intent": "CAPTURE",
  "items": [
    {
      "amount": "10.50",
      "description": "Athens 3-day guide",
      "quantity": "1",
      "product_id": "guide_a8f3..."
    }
  ],
  "locale": "ka",
  "shop_order_id": "8a4d7e3f-...",
  "redirect_url": "https://yourdomain.com/purchases/return?shop_order_id=8a4d7e3f-...",
  "capture_method": "AUTOMATIC",
  "purchase_units": [
    {
      "amount": { "currency_code": "GEL", "value": "10.50" }
    }
  ]
}
```

### Example response

```json
{
  "status": "in_progress",
  "payment_hash": "7c9a...e3",
  "order_id": "5f2c1a...",
  "links": [
    { "href": "https://ipay.ge/...", "rel": "approve", "method": "REDIRECT" },
    { "href": "https://ipay.ge/...", "rel": "self", "method": "GET" }
  ]
}
```

### What you do with the response

1. **Save `order_id` and `payment_hash`** in your purchases table, status = `PENDING`.
2. **Redirect the user to the `approve` link** (look for the link object with `rel: "approve"`).
3. The user completes payment on the BOG-hosted page.
4. iPay redirects back to your `redirect_url` and (separately) sends a callback to your registered callback URL.

### Amount formatting (avoid floating-point drift)

Store prices as **integer minor units** (GEL tetri). When sending to BOG, format as `"%d.%02d"`:

```java
private static String formatGel(long minorUnits) {
    long whole = minorUnits / 100;
    long fraction = Math.abs(minorUnits % 100);
    return String.format("%d.%02d", whole, fraction);
}
```

Never multiply or round floats; floating-point error in money calculations is a recipe for off-by-one-tetri reconciliation tickets.

---

## 6. Get payment details (verify status)

Use this **after every callback** and on the redirect-back page to verify the payment is actually `success`.

### Endpoint

```
GET {BASE_URL}/checkout/payment/{order_id}
Authorization: Bearer {access_token}
```

### Response fields

| Field | Description |
|---|---|
| `status` | `success`, `error`, or `in_progress` (auto-cancels after 1 hour) |
| `order_id` | Same as request |
| `payment_hash` | Verify against the value you stored at creation |
| `ipay_payment_id` | Receipt-friendly id |
| `status_description` | Human-readable status |
| `shop_order_id` | Your id (echoed back) |
| `payment_method` | `BOG_CARD`, `GC_CARD`, `BOG_LOAN`, `BOG_LOYALTY`, or `UNKNOWN` |
| `card_type` | `MC`, `VISA`, `AMEX` (when applicable) |
| `pan` | Masked card number (first 6 + last 4) |
| `transaction_id` | Filled only on successful card payments |
| `pre_auth_status` | `success`, `in_progress`, or `success_unblocked` (pre-auth only) |

### Status semantics

- `in_progress` — keep polling or wait for the next callback. Order auto-cancels after **1 hour**.
- `success` — money is captured (or held, for pre-auth). Mark your purchase complete.
- `error` — payment failed. Don't fulfill the purchase; the user must start a new order.

---

## 7. Refunds

### Endpoint

```
POST {BASE_URL}/checkout/refund
Authorization: Bearer {access_token}
Content-Type: application/x-www-form-urlencoded
```

Form body:

```
order_id={order_id}
amount={amount}            # optional; omit for full refund
```

### Rules

- **Refunds cannot be undone.** Make sure your refund-issuing UI requires explicit confirmation.
- **Partial refunds** can be repeated until the cumulative amount equals the original payment.
- **Time limit**: not documented in the public docs. Empirically, refunds are accepted for at least 90 days. Confirm with BOG support for your business case.

### Reference implementation

```java
public void refund(String orderId, Long amountMinorUnits) {
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
    headers.setBearerAuth(ensureToken());
    MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
    form.add("order_id", orderId);
    if (amountMinorUnits != null) form.add("amount", formatGel(amountMinorUnits));
    restTemplate.postForEntity(baseUrl + "/checkout/refund",
            new HttpEntity<>(form, headers), String.class);
}
```

A refund triggers a separate callback to your callback URL (same endpoint, different `status_description`).

---

## 8. Callbacks (webhooks)

### When BOG sends them

- After every payment status change (success, error, refund)
- After every pre-authorization completion

### Format

```
POST {your_callback_url}
Content-Type: application/x-www-form-urlencoded

status=success
order_id=5f2c1a...
shop_order_id=8a4d7e3f-...
payment_hash=7c9a...e3
ipay_payment_id=I12345...
status_description=PERFORMED
payment_method=GC_CARD
card_type=MC
pan=9000XXXXXXXX0001
transaction_id=T98765...
```

### Retry behavior

- BOG retries every **15 seconds** up to **5 times** until you return HTTP 200.
- If you return non-200, retries continue, but **failed callbacks do not roll back the payment**. The user has paid; you just haven't acknowledged the callback.

### ⚠ The unsigned-callback problem

**BOG does not document any callback signature mechanism**. Anyone who learns your callback URL can POST a forged "success" payload and trick a naive integration into fulfilling an order.

#### Mitigation: server-side verification

On every callback:

1. Extract `order_id` from the form body.
2. Call `GET /checkout/payment/{order_id}` using your authenticated client.
3. Verify the returned `payment_hash` matches the value you stored at order creation **and** the value posted in the callback body.
4. Only act on the response from the GET call, never on the callback body alone.

This pattern transforms the callback from "trustworthy notification" into "untrusted nudge to go ask BOG what really happened" — which is the only safe interpretation given the protocol.

#### Reference implementation

```java
@PostMapping(value = "/bog-ipay", consumes = "application/x-www-form-urlencoded")
public ResponseEntity<String> handleBogIpayCallback(@RequestParam Map<String, String> form) {
    String orderId = form.get("order_id");
    String callbackPaymentHash = form.get("payment_hash");
    if (orderId == null || orderId.isBlank()) return ResponseEntity.ok("OK");

    BogIpayClient.PaymentDetails details = bogIpayClient.getPaymentDetails(orderId);
    if (callbackPaymentHash != null
            && details.paymentHash() != null
            && !Objects.equals(callbackPaymentHash, details.paymentHash())) {
        log.warn("BOG iPay callback payment_hash mismatch for order_id={}", orderId);
        return ResponseEntity.ok("OK");
    }
    if ("success".equalsIgnoreCase(details.status())) {
        purchaseService.handleCheckoutCompleted(
                details.orderId(), details.ipayPaymentId(), details.transactionId());
    }
    return ResponseEntity.ok("OK");
}
```

### Idempotency

BOG's retry semantics mean **you will receive the same callback up to 5 times** for one payment. Make `handleCheckoutCompleted` idempotent. The reference implementation uses an atomic SQL update guarded by current status:

```sql
UPDATE purchases
SET status = 'COMPLETED', completed_at = :now
WHERE id = :id AND status = 'PENDING';
```

If the update affects 0 rows, the purchase was already completed — return success and do nothing else.

### Always return 200

Even on errors you can't recover from (e.g., your verification GET call failed), return 200. Otherwise BOG will keep retrying for ~75 seconds, and you'll just hit the same error 4 more times. Users return to your site and see their payment via the redirect URL anyway, where you can run the same `getPaymentDetails` check.

---

## 9. Pre-authorization (optional)

Use this when you want to **reserve** funds without charging immediately (e.g., a deposit on a booking). Funds are held for up to **30 days**.

### Flow

1. **Create order** with `intent: "AUTHORIZE"` and `capture_method: "MANUAL"`. The user pays as normal but the bank reserves rather than transfers.
2. **Complete the authorization** later by calling:

```
POST {BASE_URL}/checkout/payment/{order_id}/pre-auth/completion
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "auth_type": "FULL_COMPLETE"     // or "PARTIAL_COMPLETE" (with amount) or "CANCEL"
}
```

`auth_type` values:

- `FULL_COMPLETE` — capture the full reserved amount
- `PARTIAL_COMPLETE` — capture less than the reserved amount (provide `amount`)
- `CANCEL` — release the hold

### When to use it

- Bookings/deposits where the final amount is known later
- Marketplaces where you charge after the seller ships

The reference Brooks Prequel app does **not** use this flow because guides are sold for a fixed price at checkout.

---

## 10. Recurring payments (optional)

### Setup

1. **Contact BOG to enable** recurring payments — feature is off by default.
2. **Create a "parent" transaction**: do a normal payment of at least **0.10 GEL**. After it succeeds, refund it. The `order_id` of that transaction becomes your `parent_order_id` for all future recurring charges from that customer's saved card.
3. Store `parent_order_id` against the customer.

### Subsequent charges

```
POST {BASE_URL}/checkout/payment/subscription
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "order_id": "{parent_order_id}",
  "amount": { "currency_code": "GEL", "value": "10.00" },
  "shop_order_id": "your-internal-id",
  "purchase_description": "Monthly subscription"
}
```

Response status follows the same `success` / `error` / `in_progress` pattern.

### Notable gaps

The docs **do not** specify:

- Subscription interval/frequency primitives (you schedule the charges yourself)
- Maximum charge amount per parent
- How to revoke a parent (presumably: delete from your DB and stop charging)

The reference Brooks Prequel app does **not** use recurring payments.

---

## 11. Reference implementation map

In the Brooks Prequel codebase, the integration is split into these files:

| File | Purpose |
|---|---|
| `backend/purchase/.../BogIpayProperties.java` | `@ConfigurationProperties("bog-ipay")` — credentials, base URL, locale |
| `backend/purchase/.../BogIpayClient.java` | HTTP client: `ensureToken()`, `createOrder()`, `getPaymentDetails()`, `refund()`. Caches the access token. |
| `backend/purchase/.../PurchaseService.java` | Orchestrates: create order, persist `Purchase` row in PENDING, mark COMPLETED on verified callback |
| `backend/purchase/.../api/WebhookController.java` | `POST /api/webhooks/bog-ipay` (form-urlencoded). Verifies via `getPaymentDetails`, calls service. |
| `backend/purchase/.../domain/Purchase.java` | Entity with `bog_order_id` (unique), `bog_payment_hash`, `bog_ipay_payment_id`, `bog_transaction_id` |
| `backend/app/.../db/migration/V32__bog_ipay_purchase_columns.sql` | Idempotent schema migration adding the BOG columns |
| `backend/app/src/main/resources/application.yml` | `bog-ipay:` config block reading env vars |

To port to another stack:

- The HTTP client design is the only interesting part. The service/persistence patterns are vanilla.
- Token caching, hash verification, and idempotent purchase update are the three things you must port faithfully.

---

## 12. Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `BOG_IPAY_CLIENT_ID` | yes | — | Issued by BOG with your iPay merchant account |
| `BOG_IPAY_SECRET_KEY` | yes | — | Issued by BOG; cannot be changed by merchant |
| `BOG_IPAY_BASE_URL` | no | `https://ipay.ge/opay/api/v1` | Override only if BOG provides a sandbox URL |
| `BOG_IPAY_CALLBACK_PATH` | no | `/api/webhooks/bog-ipay` | The path you registered with BOG |
| `BOG_IPAY_LOCALE` | no | `ka` | `ka` or `en-US` |

Store `BOG_IPAY_SECRET_KEY` in a secret manager (GCP Secret Manager, AWS Secrets Manager, Vault). Never commit it to git, never log it, never include it in error responses.

---

## 13. Testing

### Local development

In `application-local.yml`, the values default to `test_client_id` / `test_secret_key`. The client will throw `IllegalStateException` on the first API call if real credentials aren't provided — set `BOG_IPAY_CLIENT_ID` and `BOG_IPAY_SECRET_KEY` env vars when you need to exercise the live flow.

### Unit testing

The `BogIpayClient` is a normal Spring component; mock the `RestTemplate` with WireMock or Spring's `MockRestServiceServer` and assert:

- `createOrder` posts the right JSON body
- `ensureToken` reuses a cached token within its expiry window
- `refund` form-urlencodes the body
- `getPaymentDetails` parses all expected fields including null-safe `transaction_id`

### Integration testing the callback

```bash
curl -X POST http://localhost:8080/api/webhooks/bog-ipay \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'order_id=test_order_123&payment_hash=expected_hash&status=success'
```

Without real BOG credentials the verification GET will fail and the callback will return 200 without acting — which is the safe default.

### Sandbox

The public docs do not advertise a sandbox. Ask BOG support whether one is available; if not, plan a small live-money test in the lowest-volume window you can negotiate.

---

## 14. Troubleshooting

| Symptom | Likely cause | Action |
|---|---|---|
| `401 invalid_client` from `/oauth2/token` | Wrong `client_id`/`secret_key` or merchant not yet activated | Verify credentials with BOG, confirm activation |
| `403` after auth succeeds | Account still in "pending mode" — callback URLs not yet configured by BOG | Email BOG with your callback URL; wait for confirmation |
| `createOrder` returns 400 with no `links` | Missing required fields, e.g. `purchase_units[].amount.value` | Validate request body matches §5 schema |
| Callback received but `payment_hash` mismatch | Forged callback or BOG re-sent for a different order | Log and return 200; do not fulfill |
| User charged but purchase still PENDING | Callback never reached you (firewall, retry exhausted) | Run a reconciliation job: list PENDING purchases older than 5 minutes, call `getPaymentDetails`, transition to COMPLETED if `success` |
| `redirect_url` 404s after payment | Your URL is gated by auth or the path doesn't exist | Ensure the redirect path is publicly reachable and renders the post-payment page |
| Refund returns 200 but funds don't move | Refund accepted by BOG but settlement is async | Check refund status via the same Payment Details endpoint |

---

## 15. Security checklist

- [ ] `BOG_IPAY_SECRET_KEY` is in a secret manager (not in git, not in env example with real values)
- [ ] Callback endpoint **always re-verifies** via `getPaymentDetails` and never trusts the callback body
- [ ] `payment_hash` from the callback is compared against the GET response and the stored value
- [ ] Purchase status transition is **atomic** (`UPDATE … WHERE status = 'PENDING'`) — duplicate callbacks cannot double-credit
- [ ] Money values are stored as **integer minor units**, not floats
- [ ] The callback endpoint is **publicly accessible without auth** (BOG can't auth) but logs every request
- [ ] Reconciliation job runs daily, comparing your PENDING purchases against `getPaymentDetails`
- [ ] Refund issuance requires explicit confirmation in the admin UI (refunds are irreversible)
- [ ] Callback URL change requires a new written request to BOG support — track this in a runbook
- [ ] Currency is enforced as `GEL` at the application boundary — non-GEL guides cannot reach `createOrder`

---

## Appendix A — Glossary

| Term | Meaning |
|---|---|
| `order_id` | BOG-issued payment identifier; key for status lookups and refunds |
| `shop_order_id` | Your application's order identifier; appears on bank statement and callback |
| `payment_hash` | BOG-issued hash for callback verification (only effective if you store and compare) |
| `ipay_payment_id` | Receipt-friendly id shown to the customer |
| `transaction_id` | Card network transaction id; only set for successful card payments |
| `parent_order_id` | The first transaction's `order_id`, reused for recurring charges (in the recurring-payments flow) |
| `tetri` | 1/100 GEL — the minor unit. 100 tetri = 1 GEL |
| `pending mode` | Account state before BOG configures your callback URLs; auth works but live orders fail |
| `pre-authorization` | Two-step capture: reserve now, charge or release later (within 30 days) |

---

## Appendix B — Sample reconciliation job (pseudo-code)

```java
@Scheduled(cron = "0 */5 * * * *")  // every 5 minutes
public void reconcilePendingPurchases() {
    List<Purchase> stale = purchaseRepository.findByStatusAndCreatedAtBefore(
            PurchaseStatus.PENDING, Instant.now().minus(Duration.ofMinutes(5)));
    for (Purchase p : stale) {
        BogIpayClient.PaymentDetails details = bogIpayClient.getPaymentDetails(p.getBogOrderId());
        if ("success".equalsIgnoreCase(details.status())
                && Objects.equals(details.paymentHash(), p.getBogPaymentHash())) {
            purchaseService.handleCheckoutCompleted(
                    details.orderId(), details.ipayPaymentId(), details.transactionId());
        }
    }
}
```

This is your safety net for missed callbacks. Without it, a single dropped webhook means a paying customer with no fulfillment.
