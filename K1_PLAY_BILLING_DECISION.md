# K1 — Play Billing decision (DO THIS BEFORE PRODUCTION)

Brooks sells **digital travel guides consumed inside the app**. Under current Google Play policy that is "digital goods", and digital goods on Play **must** be sold with Google Play Billing — **outside** the EEA and India, where DMA / CCI rulings carve out alternative billing.

Selling through Bank of Georgia iPay for a worldwide audience **will get the app rejected or removed**. This document picks a path and tells you what to do.

---

## TL;DR recommendation

**Internal testing track now** (any payment method is fine on internal testing — testers are explicitly invited, not "public").

**For production, choose path B for the first 90 days, then move to path A as the long-term answer.**

---

## The four paths

### Path A — Use Google Play Billing globally (long-term answer)
- Add Play Billing v7+ to the Capacitor Android shell (Capacitor plugin or custom native module).
- Refactor the Spring backend to verify Play Billing receipts in addition to iPay charges.
- Web continues to use iPay; Android in-app uses Play Billing.
- **Tradeoff:** Play takes 15% (standard subscription tier) – 30% (one-off purchases). On a $10 guide that's $1.50–$3.00 to Google.
- **Effort:** medium-high — 2–4 weeks including testing.
- **Risk:** lowest reviewer risk; works everywhere; defensible long-term.

### Path B — Restrict Android distribution to EEA + India (recommended first 90 days)
- Enrol in **EU User Choice Billing** and / or **India alternative billing** programmes.
- Restrict app distribution to those countries in Play Console → Pricing & distribution → Country availability.
- Keep iPay; reduced fee (~3–4 pp off Play's ordinary cut) applies.
- **Tradeoff:** app is not installable outside EEA + India for now.
- **Effort:** low — programme enrolment + country gating, no code changes.
- **Risk:** medium — programme rules are evolving; track the Play Help Centre.

### Path C — "View-only" Android app (cleanest global launch)
- The Android WebView renders brooksweb.uk but **hides all Buy CTAs** when running natively. Buying happens only on the web.
- You add a "Buy on brooksweb.uk" CTA that opens the website in a Custom Tab.
- **Tradeoff:** Worse mobile UX; users who want to buy must complete checkout in a browser tab.
- **Effort:** low — feature-flag the BuyButton off when `isNative()`.
- **Risk:** Play still scrutinises "out-of-app digital purchases" — the app is technically "viewing" not "selling," but Google has been tightening this rule too. Acceptable for launch, fragile long-term.

### Path D — Argue guides are a service, not digital goods
- Position guides as access to a travel-planning service that uses real-world routing.
- **Tradeoff:** Very unlikely to win with reviewers. Reviewers will note that the guide is delivered as in-app content with no offline / real-world counterpart. Don't pursue.

---

## How to gate Buy buttons for path B or C

Already half-built — `BuyButton.tsx` is the single gateway component. Add at the top:

```ts
import { isNative, platform } from '@/lib/capacitor';

// Path C — hide Buy entirely on native
const HIDE_BUY_ON_ANDROID = process.env.NEXT_PUBLIC_HIDE_BUY_ON_ANDROID === 'true';
const isAndroidApp = isNative() && platform() === 'android';

if (HIDE_BUY_ON_ANDROID && isAndroidApp) {
  return (
    <div className="text-sm text-ig-text-secondary">
      Purchase this guide on <a className="text-brand-500 underline"
        href="https://brooksweb.uk/guides/...">brooksweb.uk</a>.
    </div>
  );
}
```

Toggle via env var per build — keeps the web bundle untouched.

For path B, also add country-gating on the server side (use Auth0 country claim or IP geo) so EU/India users see the Buy button but everyone else does not — until you formally restrict distribution in Play Console.

---

## Concrete plan

1. **Today** — push the current changes (with iPay only) to **internal testing** track. Test on your device.
2. **This week** — decide A vs B vs C with the user.
3. **Before promoting to production** — implement the chosen path's code/policy changes, then promote.

The current commit gets you to step 1 with zero policy risk because internal testing is invited-tester-only.

---

## Source citations

- Play Billing requirement: https://support.google.com/googleplay/android-developer/answer/10281818
- EU User Choice Billing: https://support.google.com/googleplay/android-developer/answer/12348241?hl=en-GB
- EU External Offers: https://support.google.com/googleplay/android-developer/answer/16505463
- India alt billing (4% fee reduction): https://support.google.com/googleplay/android-developer/answer/13306652
- Play Billing Library v7+ required Aug 31 2025: https://developer.android.com/google/play/billing
