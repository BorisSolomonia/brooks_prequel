# Google Pay — Spring backend endpoint TODO

The Next.js frontend now contains a feature-flagged Google Pay button (`web/src/components/ui/GooglePayButton.tsx`) and a thin proxy at `web/src/app/api/purchases/google-pay/route.ts`. **Until the Spring endpoint below exists, leave `NEXT_PUBLIC_GOOGLE_PAY_ENABLED` unset (or `false`).** The button is also hidden in that case, so the existing iPay flow is the only one that fires..

---

## Endpoint contract

`POST /api/purchases/google-pay`

### Headers
| Header | Value |
|---|---|
| `Authorization` | `Bearer <Auth0 access token>` — validate against the same JWT verifier as `/api/purchases/checkout` |
| `Content-Type` | `application/json` |

### Request body
```json
{
  "guideId": "uuid",
  "paymentToken": "PaymentMethodToken-as-string-from-google.payments.api",
  "acceptedTerms": true
}
```

The `paymentToken` is the JSON-encoded `tokenizationData.token` returned by `client.loadPaymentData()` on the device. Treat it as opaque — forward to iPay verbatim.

### Response (success — 200)
```json
{ "tripId": "uuid-of-newly-created-trip" }
```

### Response (failure — 4xx or 5xx)
```json
{ "error": "human-readable message" }
```

---

## Reference flow (server-side)

1. **Validate auth.** Reject if no bearer / invalid JWT.
2. **Look up guide + price.** Same query you use today in `/api/purchases/checkout`.
3. **Build iPay Google Pay payload.** Bank of Georgia iPay accepts Google Pay tokens via their payments API — endpoint depends on which API version your account uses:
   - **Open Banking v2 / iPay 2.0:** `POST https://api.bog.ge/payments/v1/ecommerce/orders` with `payment_method: 'google_pay'` and the token in the `payment_token` field.
   - **Older Business Online iPay:** `POST https://ipay.ge/opay/api/v1/checkout/orders` with `apple_pay_google_pay_token` set.
   - Confirm with your Bank of Georgia integration manager which one your merchant id is on.
4. **Persist** the resulting `bog_order_id`, `unipay_order_id` (legacy column), purchase row, and trip row exactly as the existing iPay hosted-checkout completion does.
5. **Return** `{ tripId }`.

---

## Environment variables (Spring side)

Add to the Spring backend's properties (or your secret manager):
```
BOG_GOOGLE_PAY_MERCHANT_ID=<from BOG dashboard>
BOG_GOOGLE_PAY_GATEWAY=bogipay
```

---

## Environment variables (Next.js side, when ready to enable)

Add to `.env.production`:
```
NEXT_PUBLIC_GOOGLE_PAY_ENABLED=true
NEXT_PUBLIC_GOOGLE_PAY_ENV=PRODUCTION
NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID=<Google Pay Business Console merchant id>
NEXT_PUBLIC_GOOGLE_PAY_GATEWAY_MERCHANT_ID=<BOG merchant id, matches Spring>
```

You also need to register your app at https://pay.google.com/business/console and obtain a Google Pay merchant id before you can leave `PRODUCTION` mode. `TEST` works without registration but only accepts sandbox cards.

---

## Why Google Pay is independent of the Play Billing decision

Google Pay is **a card wallet for physical-world purchases and certain "real-world goods/services" digital transactions**. It does **not** satisfy Play Store's mandate that *digital in-app content* must use Google Play Billing. If you decide Brooks counts as a digital-goods app (see `K1_PLAY_BILLING_DECISION.md`), adding Google Pay will not change that policy outcome. Google Pay is still worth doing — it improves checkout UX on the web today and inside the Android app for the regions where iPay is permitted — but it is orthogonal to the Play Billing requirement.

---

## Smoke-test plan

1. Spring endpoint live in staging.
2. Set Next.js env: `NEXT_PUBLIC_GOOGLE_PAY_ENABLED=true`, `NEXT_PUBLIC_GOOGLE_PAY_ENV=TEST`.
3. Open a paid guide on the web in Chrome with a Google account that has a TEST card.
4. Tick terms. Verify the Google Pay button appears above the "Buy for X" button.
5. Tap Google Pay → wallet sheet → confirm → land on `/trips/<id>`.
6. Verify in DB: new `purchases` row with the Google-Pay-flagged transaction.
7. Set `NEXT_PUBLIC_GOOGLE_PAY_ENV=PRODUCTION` only after a successful live charge in TEST mode.
