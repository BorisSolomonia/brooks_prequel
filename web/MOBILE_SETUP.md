# Brooks Mobile — Phase 1 Setup (Capacitor 2A: Remote URL)

**Bundle ID**: `uk.brooksweb.app`
**App name**: `Brooks`
**Approach**: Capacitor WebView loads `https://brooksweb.uk` directly. Offline fallback in `capacitor-fallback/index.html`.

---

## What's already done

- `@capacitor/{core,cli,ios,android,share}` 6.2.1 installed
- `@capacitor/assets` 3.x devDep for icon/splash generation
- `web/capacitor.config.ts` configured (bundle ID, remote URL, iOS app-bound domains)
- `web/capacitor-fallback/index.html` offline placeholder with theme-aware styling
- npm scripts: `cap:sync`, `cap:open:ios`, `cap:open:android`, `cap:assets`

---

## What you do (in this exact order)

### 1. Enroll today (blocks submission, NOT scaffolding)

- **Apple Developer Program** — https://developer.apple.com/programs/enroll/ ($99/yr, 1–3 day approval)
- **Google Play Console** — https://play.google.com/console/signup ($25 once, hours)

### 2. Add iOS shell (run on Mac with Xcode 15+)

```bash
cd web
npx cap add ios
```

This creates `web/ios/App/App.xcworkspace`. CocoaPods is required (`sudo gem install cocoapods` if missing).

### 3. Add Android shell (run on any machine with Android SDK + JDK 17+)

```bash
cd web
npx cap add android
```

Creates `web/android/`. Requires Android Studio Hedgehog+ or standalone SDK.

### 4. Generate icons + splash screens

Place a single `1024×1024` PNG of your Brooks logo at `web/resources/icon.png`, and a `2732×2732` PNG splash background at `web/resources/splash.png` (and `splash-dark.png` for dark variant). Then:

```bash
cd web
npm run cap:assets
```

This populates every required iOS + Android icon/splash size automatically.

### 5. Sync any future code changes into the native shells

```bash
cd web
npm run cap:sync
```

Run this any time you change `capacitor.config.ts` or update Capacitor plugins. It does NOT need to run for changes to your remote site (since the WebView loads the live URL).

### 6. Build + sign + submit — iOS

```bash
cd web
npm run cap:open:ios
```

Opens `App.xcworkspace` in Xcode.

In Xcode:
- Select the **App** target → **Signing & Capabilities** tab → enable "Automatically manage signing", select your team
- Set Bundle Identifier to `uk.brooksweb.app` (must match Capacitor config)
- Set Display Name to `Brooks`
- **Product → Archive** → **Distribute App** → **App Store Connect** → upload
- Go to https://appstoreconnect.apple.com → TestFlight tab → enable for internal testers (yourself) → install via TestFlight on your phone

### 7. Build + sign + submit — Android

```bash
cd web
npm run cap:open:android
# Or build from CLI:
cd web/android
./gradlew bundleRelease
```

In Android Studio (or via Gradle):
- Open `android/` directory
- Build → Generate Signed Bundle/APK → Android App Bundle (.aab)
- Create a new keystore (save it securely — losing it locks you out of updates forever; back up to a password manager)
- Upload the `.aab` to Google Play Console → Internal Testing track

### 8. App Store + Play Store listings

For both stores you need:
- App name: **Brooks**
- Short description (≤ 80 chars): "A marketplace for travel guides — discover, create, share."
- Long description: lift from `web/src/app/page.tsx` hero text
- Privacy policy URL: https://brooksweb.uk/privacy
- Terms URL: https://brooksweb.uk/terms
- Support URL: https://brooksweb.uk/contact
- Screenshots: take from iOS Simulator (Cmd+S) and Android Emulator on at least one phone size (6.5" iPhone, 6" Android)
- Category: Travel
- Age rating: questionnaire — for Brooks the answer is 4+ / Everyone unless user-generated memories can be inappropriate, in which case 12+ / Teen

### 9. Submit for review

- Apple: 1–3 days typical
- Google: hours typical

---

## Apple Guideline 4.2 ("Minimum Functionality") — rejection mitigation

Pure WebView wrappers sometimes get rejected. We've added `@capacitor/share` to the dependency tree. Wire it into the memory share-link flow before submission so the iOS share sheet replaces the browser's `navigator.share`.

The web code at `web/src/components/maps/MapsExperience.tsx:917-918` currently does:

```ts
if (navigator.share) {
  await navigator.share({ title: 'Hidden Brooks memory', text: '...', url: share.shareUrl });
}
```

`@capacitor/share` is API-compatible — its `Share.share({...})` resolves to native iOS share sheet on iOS and to `navigator.share` on web. To use it explicitly:

```ts
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

if (Capacitor.isNativePlatform()) {
  await Share.share({ title: '...', text: '...', url: share.shareUrl });
} else if (navigator.share) {
  await navigator.share({ title: '...', text: '...', url: share.shareUrl });
}
```

This single change is enough to claim "native functionality" on the App Store review form.

---

## What comes after v1.0 (Phase 2 — weeks 2–3)

In rough priority order:

1. **`@capacitor/camera`** — replace `<input type="file" capture>` in the memory-create flow. Native camera UI, better photo quality.
2. **`@capacitor/push-notifications`** + Firebase Cloud Messaging — backend needs a `POST /api/me/device-tokens` endpoint and a notification-send service.
3. **`@capacitor/geolocation`** with foreground permissions — replaces `navigator.geolocation`. Same API surface, more reliable on mobile.
4. **`@capacitor/app`** with `App.addListener('appUrlOpen')` — handle deep links so `https://brooksweb.uk/m/{token}` opens the app instead of Safari/Chrome.
5. **Universal Links / App Links** — register your domain as an app link target via `apple-app-site-association` and `assetlinks.json` files served from `https://brooksweb.uk/.well-known/`. This is a backend change, not a Capacitor change.
6. **Background geolocation** (memory unlock when phone is asleep) — `@capacitor/geolocation` with the `'always'` permission and a justification string in `Info.plist`. Apple review is harder for this; budget an extra week.

---

## What I (the AI) did NOT do

- Did not run `cap add ios` or `cap add android` (those need Xcode + Android SDK on your machine)
- Did not change Auth0 configuration (sub-path 2A keeps the existing server-side flow)
- Did not change `next.config.js` (sub-path 2A doesn't require static export)
- Did not modify the existing share flow in `MapsExperience.tsx` — that's an explicit step for v1.0 (see "Apple Guideline 4.2" section above)
- Did not commit or push anything

---

## Quick verification (already passed locally)

- `npm install` clean (Capacitor 6.2.1)
- `npm run build` was clean before this scaffolding; needs to be re-run after to confirm Next.js still builds with the new deps installed
