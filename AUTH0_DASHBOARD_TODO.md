# Auth0 dashboard — required changes for the deep-link handover

The Capacitor Android shell now does an OAuth handover via the custom URI scheme `uk.brooksweb.app://auth/callback`. Auth0 must explicitly allow this URI before the flow works on the device — otherwise Auth0 rejects the /authorize call with `Callback URL mismatch`.

You do these in the Auth0 dashboard. **5 minutes; can be done any time before the next AAB upload.**

---

## In the Auth0 dashboard

1. Sign in at <https://manage.auth0.com>
2. Left sidebar → **Applications → Applications → Brooks** (your existing application — the one whose Client ID matches `AUTH0_CLIENT_ID` in production env)
3. **Settings** tab → scroll to **Application URIs**

## 1. Allowed Callback URLs

Find this field. It currently contains:
```
https://brooksweb.uk/api/auth/callback
```

Change it to (comma-separated, no trailing space):
```
https://brooksweb.uk/api/auth/callback, uk.brooksweb.app://auth/callback
```

## 2. Allowed Logout URLs

Add (if not already there):
```
https://brooksweb.uk
```

Custom URI for logout isn't required for the handover — we only need the callback URI.

## 3. Allowed Web Origins

Should already contain `https://brooksweb.uk`. No change needed unless missing.

## 4. Allowed Origins (CORS)

Same — `https://brooksweb.uk`. No change for the handover; just confirm it's there.

---

## Save

At the bottom of the Settings page, click **Save Changes**. Auth0 propagates within seconds.

---

## How to verify it worked

After the next AAB is uploaded and you install the updated app on your phone:

1. Open Brooks → tap **Get Started**
2. Custom Tab slides up showing the Auth0 login page
3. Sign in with email/password OR Google
4. Custom Tab dismisses
5. Brooks app foreground returns; the WebView briefly shows the loading state, then `/maps`
6. You're signed in (the navbar shows Profile / Settings / Log Out instead of Sign In)

If you see "Callback URL mismatch" inside the Custom Tab after sign-in → you forgot Step 1 above.

---

## What this enables

| Before | After |
|---|---|
| Get Started → Custom Tab → Auth0 → callback URL → **400** (cookie isolation) | Get Started → Custom Tab → Auth0 → deep link returns to app → WebView signs in cleanly |
| Email/password Auth0 works ❌ | Email/password Auth0 works ✅ |
| Google sign-in works ❌ | Google sign-in works ✅ |
| Apple Sign In works ❌ | Apple Sign In works ✅ |

---

## What you must NOT remove

- `https://brooksweb.uk/api/auth/callback` — still required for the regular browser/desktop flow
- `https://brooksweb.uk` from Allowed Origins / Logout URLs

Both the https callback AND the custom URI scheme must be present.

---

## Rolling back (if needed)

If something breaks and you want to revert: remove `uk.brooksweb.app://auth/callback` from Allowed Callback URLs, save. The web flow continues to work; the native app flow falls back to the same error you had before this change.

The code-side fallback in `lib/capacitor.ts` (`catch (err) { window.location.href = '/api/auth/login'; }`) means the app won't be completely broken — it'll just attempt the regular web flow as a last resort (which still hits the 400 issue, but at least the UI doesn't hang).
