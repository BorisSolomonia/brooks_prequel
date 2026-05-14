# Build Brooks Android — first AAB

Run these on a machine with **JDK 17** and **Android Studio Ladybug+** (SDK Platform 35 installed). Steps marked `LOCAL` run on your machine; nothing here can be done from CI without a real keystore.

---

## 0. One-time install (your machine)

- JDK 17 (Temurin or Microsoft OpenJDK)
- Android Studio Ladybug → SDK Manager → install:
  - **Android SDK Platform 35** (Android 15)
  - **Android SDK Build-Tools 35.0.0**
  - **Android SDK Platform-Tools** (for `adb`)
- Env vars (Windows):
  ```
  setx JAVA_HOME "C:\Program Files\Eclipse Adoptium\jdk-17"
  setx ANDROID_HOME "%LOCALAPPDATA%\Android\Sdk"
  setx PATH "%PATH%;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\cmdline-tools\latest\bin"
  ```

Verify:
```bash
java -version          # → 17.x
sdkmanager --list | grep "platforms;android-35"
```

---

## 1. Install new Capacitor plugins

From `web/`:
```bash
npm install
```

(The `package.json` in this repo was updated to include `@capacitor/browser`, `@capacitor/push-notifications`, and `@capacitor/splash-screen`. `npm install` picks them up.)

---

## 2. Stage source assets

Create folder `web/resources/` and drop in:

| File | Size | Purpose |
|---|---|---|
| `web/resources/icon.png` | 1024×1024 PNG, full-bleed | App icon source — `cap:assets` resizes |
| `web/resources/icon-foreground.png` | 1024×1024 PNG, transparent | Adaptive icon foreground (logo only, no bg) |
| `web/resources/splash.png` | 2732×2732 PNG, logo ≤40% centred | Splash on `#F7F1E7` |
| `web/resources/splash-dark.png` | 2732×2732 PNG | Splash on `#0E0E0E` (dark mode) |

Then:
```bash
cd web
npm run cap:assets
```

This populates every iOS + Android icon and splash density automatically using the brand colours `#C95A7D` / `#0E0E0E` / `#F7F1E7` already wired into the `cap:assets` script.

---

## 3. Generate the Android shell

From `web/`:
```bash
npx cap add android
```

This creates `web/android/`. Commit the folder (or .gitignore the `web/android/.gradle/`, `build/`, `local.properties` bits).

---

## 4. Bump targetSdk to 35 (Play 2026 floor)

Edit `web/android/variables.gradle`:
```gradle
ext {
    minSdkVersion = 23                  // Auth0 + iPay 3DS minimum
    compileSdkVersion = 35              // <-- bump
    targetSdkVersion = 35               // <-- bump
    androidxActivityVersion = '1.9.2'
    androidxAppCompatVersion = '1.7.0'
    androidxCoordinatorLayoutVersion = '1.2.0'
    androidxCoreVersion = '1.13.1'
    androidxFragmentVersion = '1.8.4'
    coreSplashScreenVersion = '1.0.1'
    androidxWebkitVersion = '1.12.1'
    junitVersion = '4.13.2'
    androidxJunitVersion = '1.2.1'
    androidxEspressoCoreVersion = '3.6.1'
    cordovaAndroidVersion = '10.1.1'
}
```

---

## 5. AndroidManifest tweaks

Open `web/android/app/src/main/AndroidManifest.xml` and:

a) **Notification permission (Android 13+):**
```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

b) **App Link for Auth0 callback** (inside `<activity android:name=".MainActivity" ...>`):
```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https"
          android:host="brooksweb.uk"
          android:pathPrefix="/api/auth/callback" />
</intent-filter>
```

c) **App label**: `android:label="Brooks"` on the `<application>` and the launcher `<activity>`.

---

## 6. Sync web → native

From `web/`:
```bash
npm run cap:sync
```

Run this every time you change `capacitor.config.ts` or update Capacitor plugins. **Not needed** for changes to the live site itself — the WebView fetches that at runtime.

---

## 7. Versioning

Edit `web/android/app/build.gradle` inside `android { defaultConfig { ... } }`:
```gradle
applicationId "uk.brooksweb.app"
minSdkVersion rootProject.ext.minSdkVersion
targetSdkVersion rootProject.ext.targetSdkVersion
versionCode 1
versionName "1.0.0"
```

For every subsequent upload to Play, increment `versionCode` by 1.

---

## 8. Generate upload keystore (DO THIS ONCE, BACK IT UP)

> ⚠️ **You cannot recover this keystore. Losing it = losing the ability to ship updates forever.** Back it up to **two separate places** — a password manager AND offline storage.

From any folder (we put it outside the repo to avoid accidental commit):
```bash
keytool -genkey -v \
  -keystore ~/brooks-upload.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias brooks-upload
```

You will be prompted for:
- Keystore password (≥ 12 chars, save to password manager)
- Alias password (use the same to keep things simple)
- Distinguished Name (e.g. `CN=Brooks, OU=Engineering, O=Brooks Prequel, L=Tbilisi, ST=Tbilisi, C=GE`)

**Back up `brooks-upload.jks` to:**
1. Your password manager (attach the file)
2. An offline encrypted volume (USB / archive cloud)
3. Optional: a private GitHub Actions secret if you plan to CI-build

---

## 9. Wire signing into Gradle

Create `web/android/key.properties` (gitignored):
```properties
storeFile=/absolute/path/to/brooks-upload.jks
storePassword=YOUR_KEYSTORE_PASSWORD
keyAlias=brooks-upload
keyPassword=YOUR_KEY_PASSWORD
```

Add to `web/android/app/build.gradle` (top of file, before `android {`):
```gradle
def keystorePropertiesFile = rootProject.file("key.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
```

Inside `android { ... }`, after `defaultConfig`:
```gradle
signingConfigs {
    release {
        storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
        storePassword keystoreProperties['storePassword']
        keyAlias keystoreProperties['keyAlias']
        keyPassword keystoreProperties['keyPassword']
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
    }
}
```

Add to `web/android/.gitignore`:
```
key.properties
*.jks
```

---

## 10. Build the AAB

From `web/android/`:
```bash
./gradlew bundleRelease
```

Output: `web/android/app/build/outputs/bundle/release/app-release.aab` (typically 5–15 MB for a Capacitor 2A shell).

**Verify 16 KB page alignment** (mandatory from May 31 2026 for native libs):
```bash
unzip -p app-release.aab base/lib/arm64-v8a/*.so 2>/dev/null \
  | head -c 64 > /dev/null && echo "Has native libs — check alignment manually" \
  || echo "No native .so libs — 16 KB alignment N/A"
```

Capacitor 2A typically has zero native libs of your own, so you're fine.

---

## 11. Smoke-test locally before upload

Install on a real Android phone via `adb`:
```bash
# Build a debug APK first (faster than AAB to install)
./gradlew assembleDebug
adb install app/build/outputs/apk/debug/app-debug.apk
```

Walk every flow: cold start → splash → WebView loads brooksweb.uk → log in (verify Custom Tab opens for Auth0) → browse a guide → tap Buy → land back on /purchases/success → settings → Delete account.

---

## 12. Upload to Play Console internal testing

1. Play Console → All apps → Create app → fill: app name **Brooks**, default language **English (UK)**, app/game **App**, free/paid **Free** (in-app purchases listed separately), declarations checkboxes.
2. Set up **Play App Signing**: upload your `brooks-upload.jks` public certificate. Play generates and holds the distribution key. You keep using your upload keystore for every release.
3. **App content** section — every sub-form must turn green. Use answers from `DATA_SAFETY_ANSWERS.md`.
4. Privacy policy URL: `https://brooksweb.uk/privacy`
5. **Account deletion URL** (under App content → Data deletion): `https://brooksweb.uk/account/delete`
6. **Main store listing** — use copy from `STORE_LISTING.md`.
7. Releases → **Internal testing** → Create new release → upload `app-release.aab`.
8. Add tester email list, copy the opt-in URL, install on your device via the URL.

---

## 13. Before promoting to Production

- Resolve the **K1 Play Billing decision** (`K1_PLAY_BILLING_DECISION.md`) — internal testing is fine with iPay-only; production-worldwide is not.
- Host `assetlinks.json` at `https://brooksweb.uk/.well-known/assetlinks.json` (see `ASSETLINKS_FOR_HOSTING.md`).
- Capture real-device screenshots (1080×1920 minimum, 4–8 shots).
- Run a build with `NEXT_PUBLIC_GOOGLE_PAY_ENABLED=true` only after the backend `/api/purchases/google-pay` endpoint is live (`GOOGLE_PAY_BACKEND_TODO.md`).

---

## Cheat sheet

```bash
# After ANY code change in web/, before rebuilding:
cd web && npm run cap:sync

# After Capacitor config or plugin change:
cd web && npm install && npx cap sync android

# Rebuild AAB for next upload (after bumping versionCode):
cd web/android && ./gradlew bundleRelease
```
