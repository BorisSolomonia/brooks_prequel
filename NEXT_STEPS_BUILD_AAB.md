# Build your first Brooks AAB — exactly what's left for you

This file is the **single source of truth** for what remains between you and a `.aab` you can upload to Google Play Console. Everything before this step has been done in the repo. Read in order, run in order.

If you only do one thing, it's the **summary checklist** at the end. The rest is detail and explanation.

---

## What's already done (you do NOT redo these)

| ✅ Done | Where |
|---|---|
| Capacitor plugins installed (`browser`, `push-notifications`, `splash-screen`, `share`) | `web/node_modules/@capacitor/*` |
| Capacitor config wired for Android (scheme, allowNavigation, plugin block) | `web/capacitor.config.ts` |
| Android shell generated (`npx cap add android`) | `web/android/` |
| `web/android/variables.gradle` bumped to `minSdk 23`, `compile/targetSdk 35` (Play 2026 floor) | `web/android/variables.gradle` |
| AndroidManifest: app label = "Brooks", INTERNET + ACCESS_NETWORK_STATE + POST_NOTIFICATIONS permissions, Auth0 deep-link intent-filter with `autoVerify="true"` | `web/android/app/src/main/AndroidManifest.xml` |
| `app/build.gradle`: `versionCode 1`, `versionName "1.0.0"`, `signingConfigs.release` reads from `key.properties` if present | `web/android/app/build.gradle` |
| `key.properties.example` template | `web/android/key.properties.example` |
| `.gitignore` excludes `*.jks`, `*.keystore`, `key.properties` | `web/android/.gitignore` |
| `web/resources/README.md` describes the four source PNGs you must drop in | `web/resources/README.md` |
| `web/public/.well-known/assetlinks.json` placeholder with REPLACE markers | `web/public/.well-known/assetlinks.json` |
| `cap sync android` run (4 plugins detected, web assets copied into android/) | n/a — already executed |

---

## What's left for you — in order

### A. One-time machine setup (skip if already done)

You need **JDK 17** and the **Android 15 SDK** on a Windows host (or macOS). WSL alone cannot build the AAB because the Android tooling expects a native FS and Gradle paths.

1. **Install JDK 17**
   - Download from Eclipse Adoptium: <https://adoptium.net/temurin/releases/?version=17>
   - Or Microsoft Build of OpenJDK: <https://learn.microsoft.com/en-us/java/openjdk/download#openjdk-17>
2. **Install Android Studio Ladybug** (or newer) from <https://developer.android.com/studio>
   - On first launch, open `SDK Manager` → install:
     - **Android SDK Platform 35** (Android 15.0)
     - **Android SDK Build-Tools 35.0.0**
     - **Android SDK Platform-Tools** (for `adb`)
3. **Set environment variables** (Windows PowerShell, run **as your user** not Administrator):
   ```powershell
   setx JAVA_HOME "C:\Program Files\Eclipse Adoptium\jdk-17.0.13.11-hotspot"
   setx ANDROID_HOME "$env:LOCALAPPDATA\Android\Sdk"
   setx PATH "$env:PATH;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\cmdline-tools\latest\bin"
   ```
   Close and re-open your terminal after running `setx`.
4. **Verify**:
   ```bash
   java -version            # → openjdk 17.x or similar
   sdkmanager --list 2>&1 | grep "platforms;android-35"   # should show "Installed"
   ```

### B. Stage your brand artwork

Drop four PNGs into `web/resources/` (folder is already created — see `web/resources/README.md`):

| File | Size | Notes |
|---|---|---|
| `icon.png` | 1024 × 1024 | Full-bleed brand mark, no transparency, no pre-rounded corners |
| `icon-foreground.png` | 1024 × 1024 | Brand mark only on transparent background — Android paints the rose colour behind it for adaptive icons |
| `splash.png` | 2732 × 2732 | Logo centred at ≤ 40 % of frame, parchment `#F7F1E7` background |
| `splash-dark.png` | 2732 × 2732 | Same logo, `#0E0E0E` background |

Then from `web/`:

```bash
npm run cap:assets        # regenerates every iOS/Android icon + splash density
npx cap sync android      # copies the generated assets into web/android/
```

You can build without these (Play Console will reject the green Capacitor placeholder, but local builds still succeed). Best to do step B before step E.

### C. Generate the upload keystore — ONCE, BACK IT UP

> 🛑 **Irreversible.** If you lose this file or its password, you can never upload another update to this app. Back up to TWO places before doing anything else.

From any folder you don't commit (your home, not the repo):

```bash
keytool -genkey -v -keystore %USERPROFILE%\brooks-upload.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias brooks-upload
```

You'll be prompted for:
- **Keystore password** — generate a strong one, save to your password manager
- **Key (alias) password** — use the same value to keep things simple
- **Distinguished Name**, e.g.:
  ```
  CN=Brooks, OU=Engineering, O=Brooks Prequel, L=Tbilisi, ST=Tbilisi, C=GE
  ```

**Back up `brooks-upload.jks` and BOTH passwords to:**
1. Your password manager (attach the file directly)
2. An encrypted offline volume (USB / a separate cloud archive)

### D. Wire the keystore into the build

1. Copy the template:
   ```bash
   cd web/android
   copy key.properties.example key.properties     # Windows
   # or
   cp key.properties.example key.properties        # macOS / WSL
   ```
2. Edit `web/android/key.properties` and replace the four values with the real ones:
   ```properties
   storeFile=C:\\Users\\Boris\\brooks-upload.jks
   storePassword=actual-keystore-password
   keyAlias=brooks-upload
   keyPassword=actual-key-password
   ```
   Note: on Windows, use **double backslashes** in the path, or forward slashes.
3. Confirm `web/android/key.properties` is gitignored:
   ```bash
   cd web/android && git check-ignore key.properties
   ```
   Should print `key.properties` (meaning it's ignored). If it prints nothing, it would be committed — stop and check.

### E. Build the AAB

From `web/android/`:

```bash
./gradlew bundleRelease
```

First run may take 5–10 minutes (downloads Gradle 8.x + AndroidX libs). Subsequent builds are < 1 minute.

When it finishes:
```
BUILD SUCCESSFUL in 6m 32s
```

The AAB is at:
```
web/android/app/build/outputs/bundle/release/app-release.aab
```

That's the file you upload to Play Console.

### F. Get your SHA-256 fingerprints + finish `assetlinks.json`

After you create the Play Console listing and enable **Play App Signing** (Console will guide you), it shows **two** fingerprints:

1. **App signing key certificate** — used in production by Play
2. **Upload key certificate** — the one your `brooks-upload.jks` produces

Get the upload key fingerprint locally:
```bash
keytool -list -v -keystore %USERPROFILE%\brooks-upload.jks -alias brooks-upload \
  | findstr /i "SHA256:"      # Windows
# or (mac/wsl):
keytool -list -v -keystore ~/brooks-upload.jks -alias brooks-upload \
  | grep -i "SHA256:"
```

Edit `web/public/.well-known/assetlinks.json` and replace both `REPLACE_WITH_...` strings with the actual fingerprints (the `XX:XX:XX:...` colon-separated form). Deploy the site so the file is reachable at `https://brooksweb.uk/.well-known/assetlinks.json`. Verify with:

```bash
curl -s https://brooksweb.uk/.well-known/assetlinks.json | head
```

### G. Create the Play Console listing + upload the AAB

Use:
- `STORE_LISTING.md` for the listing copy
- `DATA_SAFETY_ANSWERS.md` for the form
- `BUILD_ANDROID.md` step 12 for the upload walkthrough

---

## Summary checklist — print this and tick as you go

- [ ] JDK 17 installed (`java -version` shows 17)
- [ ] Android SDK Platform 35 + Build-Tools 35.0.0 installed
- [ ] `JAVA_HOME` and `ANDROID_HOME` env vars set, terminal restarted
- [ ] Brand source PNGs placed in `web/resources/` (4 files)
- [ ] `npm run cap:assets` succeeded
- [ ] `npx cap sync android` succeeded
- [ ] Upload keystore generated (`brooks-upload.jks`)
- [ ] Keystore **backed up to TWO secure places**
- [ ] `web/android/key.properties` created and filled in
- [ ] `git check-ignore key.properties` confirms it's ignored
- [ ] `./gradlew bundleRelease` succeeded
- [ ] `app-release.aab` exists at `web/android/app/build/outputs/bundle/release/`
- [ ] Play Console listing created, Play App Signing enabled
- [ ] SHA-256 fingerprints obtained
- [ ] `web/public/.well-known/assetlinks.json` updated with both fingerprints, deployed live
- [ ] `assetlinks.json` reachable via curl from public internet
- [ ] AAB uploaded to **Internal testing** track
- [ ] Smoke tests pass on a real Android phone via internal testing opt-in URL

---

## Recovery from common errors

| Error | Cause | Fix |
|---|---|---|
| `SDK location not found` | `ANDROID_HOME` unset | Re-run `setx` + restart terminal |
| `Could not find tools.jar` | JDK 17 not on PATH | Set `JAVA_HOME` correctly |
| `Keystore was tampered with, or password was incorrect` | wrong password in `key.properties` | Edit `key.properties` |
| `Execution failed for task ':app:signReleaseBundle'` | `key.properties` missing or unreadable | Verify file exists and Gradle can read it |
| `Manifest merger failed` after editing `AndroidManifest.xml` | XML syntax error | Reset to template, re-apply edits |
| `Could not resolve all files for configuration ':capacitor-android:debugRuntimeClasspath'` | offline / proxy issue | Check network, run again with `--refresh-dependencies` |

If you hit something not in this table, paste the error to me and I'll diagnose it.
