# Brooks v1.2.1 (versionCode 21) — release / tester notes

## What changed
- **Fixes logout & login opening Chrome instead of returning to the app.** The Android App Link
  now claims **all** `brooksweb.uk` paths (`pathPrefix="/"`), so the logout return (home page) and
  the login callback route back into the Brooks app.

## ⚠️ Testers: uninstall + reinstall once (important)
If you installed an earlier build, please **uninstall Brooks and reinstall** this version once.
A plain in-place update can keep a stale Android "open links" state from the earlier builds
(when the domain-verification file wasn't finalized), which would still send logout/login to
Chrome. A clean reinstall lets Android re-verify `brooksweb.uk` and enable in-app link handling
automatically.

If you'd rather not reinstall, you can instead enable it manually:
**Settings → Apps → Brooks → Open by default → Open supported links → enable, and make sure
`brooksweb.uk` is checked.**

## One-time backend/config checklist (already expected to be set)
- Auth0 → Application → **Allowed Logout URLs** must include `https://brooksweb.uk`.
- Auth0 → **Allowed Callback URLs** must include `https://brooksweb.uk/api/auth/callback` and
  `uk.brooksweb.app://auth/callback`.
- `https://brooksweb.uk/.well-known/assetlinks.json` must be live with the real Play app-signing
  + upload-key SHA-256 fingerprints (it is).

## Artifact
`web/android/app/build/outputs/bundle/release/app-release.aab` (versionCode 21, signed).
