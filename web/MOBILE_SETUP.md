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

---

# Debugging preparation — phone + laptop

Everything below is what you need installed and configured BEFORE you can
debug the Android app from your laptop. None of this is theoretical; it's
the exact set of gotchas learned from real Brooks debugging sessions in
May 2026.

> For the full step-by-step debugging walkthrough see `DEBUG_ANDROID.md`
> at the repo root. The section below is the prerequisite checklist —
> get these done once, then `DEBUG_ANDROID.md` is the daily reference.

## Laptop side (one-time, ~30 min)

### 1. Install Android Studio

Get it from <https://developer.android.com/studio>. Install with the
**Standard** option (NOT custom). It bundles ADB (Android Debug Bridge),
which is the tool your laptop talks to the phone with.

ADB ends up at one of:
- Windows: `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe`
- macOS: `~/Library/Android/sdk/platform-tools/adb`
- Linux: `~/Android/Sdk/platform-tools/adb`

Verify it works (PowerShell on Windows):

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" version
```

You should see `Android Debug Bridge version 1.0.41`. If not, the install
went somewhere non-default — find platform-tools via SDK Manager.

### 2. Add ADB to PATH (so `adb` works from any terminal)

Skip this if you only ever use the `adb-debug.ps1` helper, which
auto-detects ADB. For raw `adb` commands, this saves typing:

**Windows (PowerShell, run once):**

```powershell
[Environment]::SetEnvironmentVariable(
  "Path",
  [Environment]::GetEnvironmentVariable("Path","User") + ";$env:LOCALAPPDATA\Android\Sdk\platform-tools",
  "User")
```

Close every open PowerShell window. Open a fresh one. `adb version`
should now work without the full path.

**macOS/Linux:** add the platform-tools path to your shell rc file
(`~/.zshrc` or `~/.bashrc`).

### 3. PowerShell execution policy (Windows only)

The Brooks repo ships `scripts/adb-debug.ps1`. PowerShell blocks
unsigned local scripts by default. Allow them for your user once:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

> **PowerShell 5.1 parser gotcha:** the Windows-default PowerShell 5.1
> treats `<` as a reserved operator even inside double-quoted strings in
> some contexts. The Brooks helper uses single-quoted literals to dodge
> this. If you write your own helper scripts, prefer single quotes for
> any string containing `<`, `>`, or `;` followed by an `if`/`for`
> keyword.

### 4. Install Chrome on the laptop

Any recent Chrome. The page `chrome://inspect/#devices` is THE primary
debugging surface — it attaches DevTools to the live WebView on the
phone. Edge works too (it's also Chromium-based).

## Phone side (one-time, ~5 min)

### 5. Enable Developer Options

1. Settings → About phone (sometimes nested under System → About phone)
2. Find **Build number** at the bottom
3. **Tap it 7 times**. After tap 3-4 the OS counts down. At tap 7 it
   says "You are now a developer!"
4. May ask for your screen-lock PIN — enter it

### 6. Enable USB debugging

1. Settings → System → **Developer options**
2. Toggle **USB debugging** ON
3. (Recommended) toggle **Stay awake** ON so the screen doesn't sleep
   while plugged in

### 7. Pick a data-carrying USB cable

This trips up almost everyone. **Not all USB cables carry data.** Some
are charge-only (power pins, no data pins). They look identical.

- The cable that shipped in your phone's box → always data
- A random cable from a drawer → 30% chance it's charge-only
- The test: after USB debugging is on (step 6), plug in. If the phone
  doesn't show in `adb devices` AND no "Allow USB debugging?" dialog
  appears → try a different cable

## First-time pairing (one-time per laptop, ~30 sec)

### 8. Plug in + accept the trust dialog

1. Plug the phone into the laptop with a data cable
2. Pull down the notification shade on the phone
3. Tap **"Charging this device via USB"** → switch to **File transfer**
   (this is what makes ADB visible)
4. A dialog pops up on the phone: **"Allow USB debugging?"** with a long
   fingerprint. **Check "Always allow from this computer"**, tap **Allow**
5. From the laptop:

   ```powershell
   adb devices
   ```

   Should print:
   ```
   List of devices attached
   2B201JEHN03654    device
   ```

   The word `device` is what matters. If you see `unauthorized` → re-tap
   Allow on the phone. Empty list → bad cable, retry step 7.

## Brooks-specific app prep

### 9. Required Capacitor plugins for permission flows

The Brooks app uses these plugins for native Android features. Verify
they're in `package.json` `dependencies`:

```
@capacitor/app                ← deep links (Auth0 callback)
@capacitor/browser            ← OAuth Custom Tabs
@capacitor/geolocation        ← location permission + getCurrentPosition
@capacitor/push-notifications ← POST_NOTIFICATIONS permission
@capacitor/share              ← native share sheet
@capacitor/splash-screen      ← splash screen
```

**Critical gotcha:** installing a Capacitor plugin via `npm install` does
NOT automatically register its native code with the Android project. You
MUST run:

```powershell
npx cap sync android
```

…AFTER `npm install` and BEFORE `gradlew bundleRelease`. Skipping this
results in `Capacitor: Plugin <name> not implemented on android` errors
at runtime, with no system permission dialogs ever appearing.

### 10. Required Android manifest permissions

`web/android/app/src/main/AndroidManifest.xml` must declare every
permission the app will request at runtime. The Brooks set:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

If a permission is not declared here, calling `requestPermissions()`
from JS produces a silent `"No requestable permission in the request"`
in logcat with no system dialog. Settings → Apps → Brooks → Permissions
will not show a toggle for an undeclared permission.

### 11. Build + sign + upload chain (the order matters)

```powershell
cd web
npm install                # picks up any new deps
npx cap sync android       # registers plugin Java with Android project
cd android
.\gradlew bundleRelease    # produces app-release.aab
# Upload web\android\app\build\outputs\bundle\release\app-release.aab
# to Play Console → Internal Testing
```

Every Play upload requires a unique `versionCode` — edit
`web/android/app/build.gradle` and bump:

```
versionCode 7         →   versionCode 8
versionName "1.0.6"   →   versionName "1.0.7"
```

If Play rejects with "version code already used" — bump higher.

## Verifying what's actually installed on the phone

After Play has propagated (15-30 min) and you've reinstalled on the
phone, confirm the right build landed:

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb shell dumpsys package uk.brooksweb.app | Select-String 'versionCode|versionName|granted=|FINE_LOCATION|POST_NOTIFICATIONS'
```

Expected output keys to look for:
- `versionCode=N` matching what you built
- `versionName=1.0.N` matching what you built
- Lines for each manifest-declared permission with `granted=true|false`
- If `FINE_LOCATION` line is MISSING → installed APK has the old
  manifest, Play hasn't propagated the latest upload yet

## Daily debugging — minimal recall (full version in MOBILE_GUIDE.md)

For your daily "plug in and debug" cycle, you don't need to repeat
steps 1-7 — they're done forever. The daily flow is:

```powershell
cd C:\Users\Boris\Dell\Projects\APPS\Brooks_prequel\web
adb devices                           # confirm phone visible
.\scripts\adb-debug.ps1 inspect       # opens chrome://inspect/#devices
# In Chrome, click "inspect" next to "WebView in uk.brooksweb.app"
# → full DevTools attached to the running app
```

The first section of `MOBILE_GUIDE.md` has this expanded — see there
for "I debugged yesterday, just plugged in today, what now" flow.

## Gotchas to internalize (learned the hard way May 2026)

- **Pixel launcher caches icons even across uninstall.** If an icon
  update doesn't appear after fresh install:
  `adb shell pm clear com.google.android.apps.nexuslauncher` + `adb reboot`.
- **`navigator.geolocation` in the Capacitor WebView is sandboxed** —
  it does NOT trigger the Android system permission dialog. Must use
  `@capacitor/geolocation`'s `Geolocation.requestPermissions()`.
- **Themed icons on Android 13+ Pixel** can suppress the colored icon
  if a `<monochrome>` layer is provided. The launcher shows a silhouette
  in the system accent color, which to the user looks like "default
  icon". Verify by disabling Themed icons in Wallpaper & style.
- **WebView console.log only visible in DEBUG builds** by default. For
  release builds, attach Chrome DevTools via chrome://inspect to see
  JS-side logs. The raw `adb logcat` command will only show Android
  system events, not WebView console output.
- **`ERR_HTTP_RESPONSE_CODE_FAILURE`** in the WebView is usually a
  cache state issue — force-stop the app, `adb-debug.ps1 clear`, retry.
- **First-launch crash** can be caught with a React error boundary;
  Brooks ships `src/components/RootErrorBoundary.tsx` for this. Any
  caught error is also pushed to `window.__brooksErrors` for adb-side
  inspection.
