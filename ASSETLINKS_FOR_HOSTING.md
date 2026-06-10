# Digital Asset Links — host before first internal-test upload

This JSON proves to Android that `brooksweb.uk` and the Play-signed `uk.brooksweb.app` are the same publisher. Without it, the Auth0 callback opens the system browser instead of returning to your app, and any future `https://brooksweb.uk/...` deep link is not auto-verified..

---

## Step 1 — get your signing fingerprints

After you have built and uploaded the AAB to Play (BUILD_ANDROID.md), Play Console → **Setup → App signing** shows TWO SHA-256 fingerprints:

1. **App signing key certificate** — used in production by Play
2. **Upload key certificate** — used by you when uploading

Include **both** so internal-testing builds (signed by upload key) and production builds (re-signed by Play's app-signing key) are both verified.

You can also extract the upload key locally:
```bash
keytool -list -v -keystore ~/brooks-upload.jks -alias brooks-upload | grep -i "SHA256:"
```

---

## Step 2 — write the file

Save at `https://brooksweb.uk/.well-known/assetlinks.json`, served with `Content-Type: application/json`, **no redirects, no auth**, **no robots disallow**. Public, anonymous fetch must return the content directly.

```json
[
  {
    "relation": [
      "delegate_permission/common.handle_all_urls",
      "delegate_permission/common.get_login_creds"
    ],
    "target": {
      "namespace": "android_app",
      "package_name": "uk.brooksweb.app",
      "sha256_cert_fingerprints": [
        "REPLACE_WITH_PLAY_APP_SIGNING_SHA256",
        "REPLACE_WITH_UPLOAD_KEY_SHA256"
      ]
    }
  }
]
```

Replace `REPLACE_WITH_...` with the exact `XX:XX:XX:...` form (colon-separated hex) shown in Play Console / `keytool` output.

---

## Step 3 — Next.js hosting

Place the file at `web/public/.well-known/assetlinks.json`. Next.js serves anything under `public/` at the matching URL. **No additional config required.**

After deploying:
```bash
curl -s https://brooksweb.uk/.well-known/assetlinks.json | jq .
```

Should print the JSON. If you get HTML / a redirect / 404, fix that before the next AAB upload.

---

## Step 4 — verify

Use the official Statement List Tester:
```
https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://brooksweb.uk&relation=delegate_permission/common.handle_all_urls
```

Should return `{ "statements": [...] }` with your package. If it's empty, Android won't auto-open the app for `https://brooksweb.uk/api/auth/callback`.

---

## Step 5 — re-verify after every signing-key change

If you ever rotate the upload key (Play allows this), regenerate the SHA-256 and update this file. Auth0 callbacks will silently start opening in the system browser the moment the fingerprint stops matching.
