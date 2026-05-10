# Brooks Mobile App — Complete Build Guide

This guide takes the existing **Brooks** Next.js web app at https://brooksweb.uk and turns it into real iOS + Android apps you can publish to the App Store and Google Play. It is written for someone with no mobile-development experience. Every command, every button click, every form field is here.

If you follow this guide top to bottom you will end up with:
- An iOS app installable on iPhone via TestFlight, then on the App Store
- An Android app installable on any Android device via Google Play Internal Testing, then on the Play Store
- Bundle ID `uk.brooksweb.app` on both platforms
- Same Brooks name and brand on both platforms
- All your existing web features available immediately (login, guides, maps, memories, purchases)

---

## How to use this guide

- **Read in order.** Each part assumes the previous parts are done.
- **Do not skip.** If a step says "wait until Apple emails you," wait. Do not move on. Apple's review queue is the longest blocker in the whole process.
- **Time estimates** are at the top of each part. They assume nothing goes wrong. Add 30% buffer.
- **What you should see** boxes describe the screen after each command. If your screen does not look like that, jump to **Part 8: Troubleshooting**.
- **Never share** the contents of `.env*` files, your Apple signing certificates, your Android keystore, or your Google service account JSON. Anywhere. Not in screenshots, not in Slack, not in git.

### Symbol legend

- ✅ Green check = expected success state
- ❌ Red X = a problem; what to do if you see this
- 🍎 Apple-only step (do on a Mac)
- 🤖 Android-only step (works on Mac, Windows, or Linux)
- 💰 Costs money
- ⏱ Wait time you can't shorten

---

## Time and cost summary

| Phase | What you do | Time | Cost |
|---|---|---|---|
| Part 0 | Install software, enroll in stores | 1 day active + 1–3 day wait | $99 + $25 |
| Part 1 | Set up project locally | 1 hour | — |
| Part 2 | iOS build through TestFlight | 1 day | — |
| Part 3 | Android build through Internal Testing | 1 day | — |
| Part 4 | Write store listings | Half day | — |
| Part 5 | Submit and pass review | 1 day active + 1–3 day wait | — |
| Part 6 | Add native plugins (camera, push, geo) | 1–2 weeks | — |

**Total to v1.0 in stores: ~7–10 days elapsed, ~3–4 days of active work.**

---

# Part 0 — Prerequisites

⏱ **Allow 1–3 days. Apple's enrollment review is the gating item; start it first thing in the morning of Day 1.**

## 0.1 Hardware you need

- A **Mac** running macOS Sonoma 14+ or Sequoia 15+. There is **no way around this for iOS**. Apple does not allow building iOS apps on Windows or Linux. If you only have a Windows PC, options:
  - Buy or borrow a Mac (a Mac mini M2 from 2024 is enough; ~$600 used)
  - Use a cloud Mac service like MacStadium ($50–80/month) or MacInCloud (~$30/month)
  - Use a friend's Mac for the build day
- For **Android only**, any Mac, Windows 10/11, or Linux machine with 16 GB RAM and ~30 GB free disk works.
- An **iPhone** (any model from 2018+) and an **Android phone** (any model from 2020+) for testing on real devices.

## 0.2 Software to install on your Mac

Run these commands in **Terminal** (Cmd+Space → type "Terminal" → Enter). Each command is a single line; copy-paste exactly.

### 0.2.1 Install Homebrew (if you don't have it)

Homebrew is a package manager. It installs other software with one command.

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

When prompted, type your Mac password and press Enter. The cursor doesn't move when you type a password — that's normal.

✅ After it finishes, run `brew --version`. You should see something like `Homebrew 4.x.x`.

### 0.2.2 Install Node.js 20

```bash
brew install node@20
brew link --overwrite node@20
```

✅ Run `node --version`. You should see `v20.x.x`.

### 0.2.3 Install Git

```bash
brew install git
```

✅ Run `git --version`. You should see `git version 2.x.x`.

### 0.2.4 Install Xcode

Xcode is Apple's huge developer tool. It includes the iOS Simulator, the build system, and the upload tool.

1. Open the **App Store** application (the blue circle with an "A" in your Dock).
2. Click **Search** in the sidebar.
3. Type **Xcode** and press Enter.
4. Click **Get** (or the cloud icon if you've downloaded before). It is **free**.
5. Wait. ⏱ This download is **~12 GB** and takes **30–90 minutes** depending on your connection. Do other Part 0 steps while it downloads.

After install:

```bash
sudo xcode-select --install
sudo xcodebuild -license accept
```

The first command installs the command-line tools. The second accepts Apple's developer license — required for any build.

✅ Run `xcodebuild -version`. You should see `Xcode 15.x` or `Xcode 16.x`.

### 0.2.5 Install CocoaPods

CocoaPods manages iOS native dependencies. Capacitor uses it.

```bash
sudo gem install cocoapods
```

✅ Run `pod --version`. You should see `1.15.x` or higher.

### 0.2.6 Install Android Studio

Android Studio is Google's equivalent of Xcode. It bundles the Android SDK and emulator.

1. Go to https://developer.android.com/studio
2. Click **Download Android Studio**.
3. Accept the terms, download. ⏱ ~1.2 GB, 5–15 minutes.
4. Open the downloaded `.dmg`, drag **Android Studio** into **Applications**.
5. Open Android Studio from Applications.
6. The setup wizard appears. Click **Next** through the screens, accepting defaults. When it reaches **SDK Components Setup**, make sure these are checked:
   - Android SDK
   - Android SDK Platform
   - Android Virtual Device
7. Click **Finish**. It will download more components. ⏱ Another 5–10 minutes.

✅ When you see the **Welcome to Android Studio** screen, this step is done.

### 0.2.7 Install JDK 17

Android needs Java Development Kit 17.

```bash
brew install --cask temurin@17
```

To make Java 17 the default on your Mac, add this to your shell:

```bash
echo 'export JAVA_HOME=$(/usr/libexec/java_home -v 17)' >> ~/.zshrc
source ~/.zshrc
```

✅ Run `java --version`. You should see `openjdk 17.x.x`.

## 0.3 Apple Developer Program enrollment 🍎 💰 ⏱

This costs **$99/year** and takes **1–3 days** for Apple to approve. **Start this NOW** — even before software finishes downloading. Without an Apple Developer account you cannot build for a real iPhone, you cannot use TestFlight, and you cannot submit to the App Store.

### Steps

1. Go to https://developer.apple.com/programs/enroll/
2. Click **Start Your Enrollment**.
3. Sign in with your existing Apple ID. If you don't have one, create one at https://appleid.apple.com.
4. Apple asks: **Individual** or **Organization**?
   - **Individual** = enrolled under your personal name. Apps display "Boris Solomonia" (or your name) as the seller. ⏱ Approval: 24–72 hours.
   - **Organization** = enrolled under a registered company name. Apps display "Brooks" or your company name. Requires a **D-U-N-S Number** (a free corporate identifier; takes 1–2 weeks to get if you don't have one). ⏱ Approval: 5–14 days total.
   - **Pick Individual unless you have a Limited Company already set up.** You can transfer apps to an Organization account later.
5. Fill in your legal name, address, phone, billing details.
6. Pay $99 with credit card.
7. Apple sends a confirmation email with subject like "Your enrollment is in progress."
8. **Wait.** Check email daily. The approval email subject is "Welcome to the Apple Developer Program."

### What you should see

✅ At https://developer.apple.com/account/, you can see "Apple Developer Program" with a green dot saying "Active."

❌ If after 5 days you have heard nothing: open https://developer.apple.com/contact/ and submit a "Membership" support request asking for an enrollment status update.

## 0.4 Google Play Console enrollment 🤖 💰 ⏱

This costs **$25 once** (lifetime) and takes hours, sometimes a day.

1. Go to https://play.google.com/console/signup
2. Sign in with a Google account (or create one). **Do not use a personal account you might lose access to.** Use a dedicated one (e.g. `brooks.dev@gmail.com`) so you can transfer ownership later.
3. Choose **Personal** account type (similar to Apple's "Individual" — pick Organization later if/when you have a Ltd company).
4. Fill in your name, address, phone, contact email.
5. Pay $25 with credit card.
6. Google asks for **Identity verification**: upload a photo of your ID document (passport / national ID / driver's license).
7. Wait for the verification email.

### What you should see

✅ At https://play.google.com/console/, you reach the dashboard with a left sidebar including "All apps."

❌ If verification is rejected, the email tells you why (usually image quality or name mismatch). Re-upload a clearer photo where every corner of the document is visible.

## 0.5 Decide your bundle ID — already locked

Your bundle ID is **`uk.brooksweb.app`**. Use this everywhere. Do not change it. Once you publish under a bundle ID and people install the app, changing it requires a brand-new app listing and you lose all reviews, ratings, and download counts.

## 0.6 Decide your support email

You'll need one for the store listings. It must be a real, monitored mailbox where users can write to you with bug reports. Suggested: `support@brooksweb.uk`. Set this up in your email host before Part 4.

---

# Part 1 — Set up the project locally

⏱ **Allow 1 hour.** Do this on your Mac (you'll need it for iOS anyway).

## 1.1 Clone the repository

Open Terminal and run:

```bash
cd ~/Documents
git clone <your-git-repo-url> brooks-prequel
cd brooks-prequel/web
```

Replace `<your-git-repo-url>` with the actual URL (e.g., `git@github.com:yourname/brooks-prequel.git` or `https://github.com/yourname/brooks-prequel.git`).

✅ You should see a `package.json` file in the current directory. Run `ls package.json` to confirm.

## 1.2 Install dependencies

```bash
npm install
```

⏱ ~3–5 minutes. You'll see a progress bar; you may see a few yellow "deprecated" warnings — those are fine.

✅ When done, you see `added X packages` and the prompt returns. Run `ls node_modules/@capacitor` and you should see folders named `core`, `cli`, `ios`, `android`, `share`.

## 1.3 Verify the web app builds

```bash
npm run build
```

⏱ ~1–2 minutes.

✅ The last lines should show a table of routes (`/`, `/feed`, `/maps`, `/profile`, etc.) with sizes. The very last line should NOT contain the word "error."

❌ If the build fails, the project itself has a bug. **Stop here** and fix the build before trying to make a mobile app. A broken web build cannot be wrapped in mobile.

## 1.4 Confirm Capacitor configuration

Open `web/capacitor.config.ts` and verify it looks like this:

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'uk.brooksweb.app',
  appName: 'Brooks',
  webDir: 'capacitor-fallback',
  server: {
    url: 'https://brooksweb.uk',
    cleartext: false,
  },
  ios: {
    contentInset: 'always',
    limitsNavigationsToAppBoundDomains: true,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
```

✅ The `appId` must be exactly `uk.brooksweb.app` (no typos, lowercase). The `appName` must be `Brooks`. The `server.url` must be `https://brooksweb.uk`.

❌ If any value is wrong, edit it now and save.

---

# Part 2 — iOS app: full walkthrough 🍎

⏱ **Allow one full day** the first time. Subsequent builds take ~10 minutes.

This part **requires a Mac with Xcode**. Cannot be done on Windows.

## 2.1 Add the iOS native shell

In Terminal, from the `web/` directory:

```bash
npx cap add ios
```

⏱ ~2 minutes. This creates a folder `web/ios/` containing an Xcode project (`App/App.xcworkspace`) plus all the boilerplate Apple needs.

✅ You should see:
```
✔ Adding native xcode project in: <your path>/web/ios
✔ add in 12s
✔ Updating iOS native dependencies with pod install
✔ Sync finished
```

❌ If you see "command not found: npx", your Node install in Part 0.2.2 didn't link correctly. Run `brew link --overwrite node@20` again, close the Terminal, open a new one, and retry.

❌ If you see an error mentioning "CocoaPods is not installed", redo Part 0.2.5.

## 2.2 Open the project in Xcode

```bash
npx cap open ios
```

This opens **`App.xcworkspace`** in Xcode. **Always open the `.xcworkspace` file, never the `.xcodeproj` file** — the workspace knows about CocoaPods, the project alone does not.

⏱ Xcode takes 30–60 seconds to index the project the first time. Wait until the progress bar at the top of Xcode disappears.

## 2.3 Configure signing

This is where Xcode connects to your Apple Developer account so the app can be signed.

1. In Xcode's left sidebar, click the **App** folder at the top (it has a blue folder icon).
2. In the editor area, click the **App** target (under TARGETS).
3. Click the **Signing & Capabilities** tab at the top.
4. Make sure **Automatically manage signing** is checked.
5. Click the **Team** dropdown. The first time, click **Add an Account...** This opens Xcode preferences:
   - Click the **+** button at the bottom-left.
   - Choose **Apple ID**.
   - Sign in with the same Apple ID you used in Part 0.3.
   - Close Preferences.
6. Back in Signing & Capabilities, the Team dropdown now shows your name. Pick it.
7. **Bundle Identifier** field: must say `uk.brooksweb.app`. If it doesn't, type it in.

✅ The yellow warning about provisioning profiles disappears within 10–20 seconds. You see "Provisioning Profile: Xcode Managed Profile" in green-ish text.

❌ If you see "No Account for Team" or "Failed to register bundle identifier": your Apple Developer enrollment isn't approved yet. Go back to 0.3, wait, and try again.

❌ If you see "An App ID with Identifier 'uk.brooksweb.app' is not available": someone else already registered that identifier under a different team. You'll need to pick a different bundle ID (e.g., `uk.brooksweb.brooks` or `app.brooksweb.uk`). Update `capacitor.config.ts` accordingly, then in Xcode re-set the Bundle Identifier field. **Try the original first** — it's likely available since you own brooksweb.uk.

## 2.4 Configure capabilities (none for v1.0)

Still on the Signing & Capabilities tab, you would click **+ Capability** to add things like Push Notifications. **For v1.0, skip this** — you don't need any capabilities yet. Phase 2 (Part 6) adds these.

## 2.5 Configure Info.plist (display name, version, permissions)

1. In Xcode's left sidebar, expand **App > App** (the inner folder).
2. Click **Info.plist**.
3. The right pane shows a tree of keys.
4. Verify these values; double-click to edit:
   - **Bundle display name** = `Brooks`
   - **Bundle version string (short)** = `1.0.0`
   - **Bundle version** = `1`

For v1.0, no permissions strings are needed (no camera/location/etc. plugins yet).

## 2.6 Set the deployment target

This is the minimum iOS version your app supports.

1. Click the **App** target.
2. Click the **General** tab.
3. Find **Minimum Deployments**.
4. Set **iOS** to **15.0**.

✅ This means iPhones running iOS 15 or newer can install your app (covers ~98% of devices in 2026).

## 2.7 Generate icons and splash screens

You need a single PNG of your Brooks logo and a splash background.

1. In Terminal (back in `web/`):
   ```bash
   mkdir -p resources
   ```
2. Place a **1024×1024 pixel PNG** of your Brooks logo at `web/resources/icon.png`. The logo should be on a transparent or solid background, the actual logo art filling about 70% of the square (Apple/Google adds rounded corners and padding).
3. Place a **2732×2732 pixel PNG** splash background at `web/resources/splash.png` (light theme).
4. Optionally, place a `web/resources/splash-dark.png` for the dark splash.
5. Run:
   ```bash
   npm run cap:assets
   ```
6. ⏱ ~30 seconds. The script generates every iOS and Android icon and splash size automatically.

✅ You should see ~30 lines like `✔ Generated AppIcon.appiconset/Icon-...png`.

❌ If you don't have a logo PNG yet, here's a temporary one: take any 1024×1024 image and put your Brooks wordmark on it. You can replace this anytime by re-running the same command with a new `icon.png`.

## 2.8 First simulator run (proof of life)

1. In Xcode, find the **device picker** at the top center — between the play/stop buttons and the search bar.
2. Click it. Pick **iPhone 15** under "iOS Simulators".
3. Press the **Play** button (▶) at the top-left, or **Cmd+R**.

⏱ ~2–4 minutes the first time.

✅ The iPhone Simulator opens, then the Brooks app launches inside it. You should see your live brooksweb.uk site running in a phone-shaped window.

❌ If the screen is blank or shows "Cannot connect": check `capacitor.config.ts` has `server.url: 'https://brooksweb.uk'` (HTTPS, no trailing slash). Verify your VM is up by visiting brooksweb.uk in Safari on your Mac.

❌ If you see a white screen with text "App Transport Security has blocked": you have `cleartext: true` somewhere or your URL is `http://` instead of `https://`. Fix it.

## 2.9 First device run (your real iPhone)

1. Plug your iPhone into your Mac with a USB cable.
2. On the iPhone, when prompted "Trust this computer?", tap **Trust** and enter your passcode.
3. In Xcode's device picker (the same one as 2.8), your iPhone now appears at the top. Pick it.
4. Press **Play** (▶) again.

⏱ First run: ~2 minutes.

✅ Your iPhone screen unlocks (if locked), the Brooks icon appears, the app launches. Same as the simulator.

❌ If you see "Could not launch — Untrusted Developer": on your iPhone, go to **Settings > General > VPN & Device Management**. Tap your developer profile under "Developer App." Tap **Trust**. Try Play again.

## 2.10 Archive for App Store distribution

When the app runs on your real iPhone, you're ready to upload to App Store Connect.

1. Back in Xcode's device picker, **change it to "Any iOS Device (arm64)"**. This is critical — you cannot archive for an attached device.
2. Top menu: **Product > Archive**.
3. ⏱ Archive takes ~3–8 minutes. Xcode shows a progress bar.

✅ When done, the **Organizer** window opens automatically, showing your archive in a list.

❌ If you see "No accounts with App Store Connect access": go back to Part 2.3, sign out, sign back in. Your Apple Developer enrollment must be approved.

## 2.11 Upload to App Store Connect

In the Organizer window:

1. Click the archive at the top of the list (today's date).
2. Click **Distribute App** on the right.
3. Choose **App Store Connect** > **Next**.
4. Choose **Upload** > **Next**.
5. Leave all defaults checked (Manage Version and Build Number, Strip Swift Symbols, etc.) > **Next**.
6. Choose **Automatically manage signing** > **Next**.
7. Review summary > **Upload**.

⏱ Upload: ~5–15 minutes depending on connection.

✅ "App Store Connect upload successful." Click **Done**.

❌ If "Invalid Bundle Identifier": redo Part 2.3.

❌ If "Missing required icon": redo Part 2.7 — your icons didn't generate properly.

## 2.12 Wait for processing on App Store Connect

Apple's servers process the uploaded build. ⏱ ~10–60 minutes.

1. Open https://appstoreconnect.apple.com in Safari.
2. Sign in.
3. Click **My Apps**.
4. Your app may not be there yet — click **+** at the top-left, choose **New App**:
   - Platform: **iOS**
   - Name: **Brooks**
   - Primary Language: **English (U.K.)**
   - Bundle ID: pick `uk.brooksweb.app` from the dropdown (it appears once Apple sees your upload — wait if it doesn't yet)
   - SKU: `brooks-app-001` (any unique string)
   - User Access: **Full Access**
5. Click **Create**.

✅ The app's page opens. In the **TestFlight** tab, after processing, your build appears with a yellow "Missing Compliance" badge.

## 2.13 Configure TestFlight for internal testing

1. Click the build (it's listed under "iOS Builds" in the TestFlight tab).
2. Click **Manage** next to "Missing Compliance."
3. Question: "Does your app use encryption?" — Answer: **Yes**, then **No** to "exempt from export compliance" (HTTPS counts as standard encryption; this is fine).
4. Save.
5. In TestFlight tab, click **Internal Testing** in the sidebar.
6. Click **+** next to "Internal Testers."
7. Enter your own email (the one you used for Apple ID).
8. Click **Add**. You'll get an email with a TestFlight invite.

## 2.14 Install TestFlight on your iPhone

1. On your iPhone, open the **App Store** app.
2. Search for **TestFlight**.
3. Install it. (Free, made by Apple.)
4. Open the email Apple sent. Tap **View in TestFlight**.
5. TestFlight opens with Brooks listed. Tap **Install**.

✅ Brooks installs on your iPhone via TestFlight. You can launch it like any other app from the home screen.

This is the v1.0 build. It works. The site loads inside the app. You're done with iOS technical work — Part 4 covers the App Store listing.

---

# Part 3 — Android app: full walkthrough 🤖

⏱ **Allow one full day** the first time. Can be done on Mac, Windows, or Linux.

## 3.1 Add the Android native shell

In Terminal, from `web/`:

```bash
npx cap add android
```

⏱ ~3 minutes. Creates `web/android/` folder with a Gradle project.

✅ You should see:
```
✔ Adding native android project in: <your path>/web/android
✔ add in 32s
✔ Sync finished
```

❌ "Java not found": redo Part 0.2.7 (JDK 17 install).

❌ "ANDROID_HOME is not set": Android Studio didn't set it. Add to your shell:
```bash
echo 'export ANDROID_HOME=$HOME/Library/Android/sdk' >> ~/.zshrc
echo 'export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools' >> ~/.zshrc
source ~/.zshrc
```
On Windows, set `ANDROID_HOME` via System Properties > Environment Variables to `C:\Users\<you>\AppData\Local\Android\Sdk`.

## 3.2 Open the project in Android Studio

```bash
npx cap open android
```

Android Studio opens with the `web/android/` directory loaded.

⏱ Gradle sync: 1–3 minutes. Watch the bottom status bar — wait until it says "Gradle sync finished."

❌ If the sync fails, click **File > Invalidate Caches > Invalidate and Restart**.

## 3.3 Verify package name (Android's term for bundle ID)

1. In the left sidebar (Project view), expand **app > java > uk.brooksweb.app**.
2. The package name is `uk.brooksweb.app`. ✅ This matches your iOS bundle ID. Good.

## 3.4 Generate icons and splash screens

If you didn't run `npm run cap:assets` in Part 2.7, do it now from `web/`:

```bash
npm run cap:assets
```

This populates Android icons in `web/android/app/src/main/res/mipmap-*/` automatically.

Trigger a Gradle sync: in Android Studio, click **File > Sync Project with Gradle Files**.

## 3.5 First emulator run (proof of life)

1. Top toolbar: click the **Device Manager** icon (looks like a phone with a small green Android icon).
2. Click **+ Create Virtual Device**.
3. Pick **Pixel 7** > **Next**.
4. Pick the **Tiramisu** (Android 13) system image (download if needed — ~1.3 GB, ~5 minutes).
5. **Next > Finish**.
6. Back in the toolbar, the device picker now shows "Pixel 7 API 33." Pick it.
7. Click the **Play** button (▶, green triangle) at the top.

⏱ First run: ~5 minutes (emulator boot + first install).

✅ The emulator opens, Android boots up, Brooks launches. You see brooksweb.uk inside the phone-shaped window.

❌ If Brooks shows "WebView error" / blank screen: check `capacitor.config.ts` has `server.url: 'https://brooksweb.uk'`. Run `npx cap sync android` from `web/` then re-build.

## 3.6 First device run (your real Android phone)

1. On your Android phone: Settings > About Phone > tap **Build Number** seven times until "You are now a developer" appears.
2. Settings > System > Developer Options > enable **USB Debugging**.
3. Plug phone into your computer. Accept "Allow USB debugging?" on the phone.
4. In Android Studio's device picker, your phone now appears. Pick it.
5. Click **Play**.

⏱ ~30 seconds.

✅ Brooks launches on your real phone.

## 3.7 Create a release signing keystore 💰 ⚠️

The keystore is a file that proves you (and only you) can publish updates to your app. **If you lose this file or its passwords, you lose the ability to update your app forever** (Google does not let you reset it). Back it up to a password manager, an encrypted cloud drive, AND an offline disk.

In Terminal from `web/`:

```bash
keytool -genkey -v -keystore brooks-release.keystore -alias brooks -keyalg RSA -keysize 2048 -validity 10000
```

It prompts:
- **Enter keystore password**: choose a strong password. **Write it down securely**.
- **Re-enter password**: same.
- **First and last name**: your full name.
- **Organizational unit**: `Brooks` (or leave blank).
- **Organization**: `Brooks` (or your company name).
- **City**: your city.
- **State**: your state/region.
- **Country code**: 2-letter ISO code (e.g., `GB` for United Kingdom, `GE` for Georgia, `US` for USA).
- **Confirm**: type `yes`.
- **Enter key password for <brooks>**: press Enter to use the same password as the keystore.

✅ A file `brooks-release.keystore` is now in `web/`. **Move it OUT of the repository** (so you don't accidentally commit it):

```bash
mkdir -p ~/Documents/brooks-keys
mv brooks-release.keystore ~/Documents/brooks-keys/
```

Add to a password manager (1Password, Bitwarden, etc.) under a "Brooks Android Keystore" entry:
- File path: `~/Documents/brooks-keys/brooks-release.keystore`
- Keystore password: <what you chose>
- Key alias: `brooks`
- Key password: <same as keystore password>

❌ If you skip the password manager and lose the keystore, **you cannot update your app**. You'd have to publish under a different package name as a brand-new app. **Do not skip.**

## 3.8 Configure Gradle to sign release builds

1. In Android Studio, expand **Gradle Scripts > build.gradle (Module: app)**.
2. Find the section `android { ... }`.
3. Inside it, after `defaultConfig { ... }` and before `buildTypes { ... }`, paste:

```groovy
signingConfigs {
    release {
        storeFile file(System.getenv('BROOKS_KEYSTORE_PATH') ?: '/path/to/brooks-release.keystore')
        storePassword System.getenv('BROOKS_KEYSTORE_PASSWORD') ?: ''
        keyAlias 'brooks'
        keyPassword System.getenv('BROOKS_KEY_PASSWORD') ?: ''
    }
}
```

4. Replace `/path/to/brooks-release.keystore` with the actual full path you used in 3.7 (e.g., `/Users/boris/Documents/brooks-keys/brooks-release.keystore`).

5. In the same file, find `buildTypes { release { ... } }` and add `signingConfig signingConfigs.release` so the block looks like:

```groovy
buildTypes {
    release {
        minifyEnabled false
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        signingConfig signingConfigs.release
    }
}
```

6. Save.

7. In your Mac shell (`~/.zshrc`) add:
```bash
echo 'export BROOKS_KEYSTORE_PATH="$HOME/Documents/brooks-keys/brooks-release.keystore"' >> ~/.zshrc
echo 'export BROOKS_KEYSTORE_PASSWORD="<your keystore password>"' >> ~/.zshrc
echo 'export BROOKS_KEY_PASSWORD="<your key password>"' >> ~/.zshrc
source ~/.zshrc
```

(Replace `<your keystore password>` with the actual password — yes, it's plain text on your Mac. Acceptable for a single dev machine; do not put on a shared computer.)

## 3.9 Build a release Android App Bundle (.aab)

In Terminal from `web/android/`:

```bash
./gradlew bundleRelease
```

⏱ ~3–6 minutes the first time.

✅ Output: `BUILD SUCCESSFUL`. The `.aab` file is at `web/android/app/build/outputs/bundle/release/app-release.aab`. This file is what you upload to Google Play.

❌ "Keystore was tampered with, or password was incorrect": the password env vars don't match what you set in Part 3.7. Re-set them. Close the terminal and open a new one (env vars only apply to fresh shells).

## 3.10 Create the app on Google Play Console

1. https://play.google.com/console/
2. Click **Create app**.
3. Fill in:
   - App name: **Brooks**
   - Default language: **English (United Kingdom)**
   - App or game: **App**
   - Free or paid: **Free**
   - Declarations: check both ("comply with developer program policies" and "US export laws").
4. Click **Create app**.

## 3.11 Upload your first build to Internal Testing

1. In the left sidebar, click **Testing > Internal testing**.
2. Click **Create new release**.
3. Click **Choose signing key** > **Use Google-generated key** (recommended; Google manages the App Signing Key, you keep your Upload Key).
4. **App bundle**: drag-and-drop your `app-release.aab` file from `web/android/app/build/outputs/bundle/release/`.
5. ⏱ Upload + Google's processing: 5–15 minutes.
6. **Release name**: `1.0.0 (1)` — auto-suggested.
7. **Release notes**: `Initial release.` (you can flesh this out later).
8. Click **Next > Save > Review release**.

## 3.12 Add yourself as an internal tester

1. Still in **Internal testing** > **Testers** tab.
2. Click **Create email list**.
3. Name: `Brooks internal`. Add your own email.
4. Save.
5. Back on the release page, click **Roll out to Internal testing**.
6. **Confirm**.

✅ You see "Active" with one release.

## 3.13 Install on your Android phone

1. On the same Internal testing page, click **Copy link** under "Tester join URL."
2. Open that link on your phone (paste it into Chrome).
3. Tap **Become a tester**.
4. Tap **Download it on Google Play** — Play Store opens.
5. Tap **Install**.

✅ Brooks installs on your Android phone via Google Play.

You're done with Android technical work.

---

# Part 4 — Store listings

⏱ **Allow half a day.** This is writing-and-screenshot work.

## 4.1 Common assets you need (both platforms)

Prepare these once and use for both stores.

### Visual assets

1. **App icon**: 1024×1024 PNG (already done in Part 2.7).
2. **Feature graphic** (Play Store only): 1024×500 PNG. Brand-pink background, "Brooks" wordmark + tagline "Travel guides, your way."
3. **Screenshots** — minimum 4, recommended 6, per platform:
   - **iOS**: 1290×2796 (iPhone 15 Pro Max) and 2048×2732 (iPad Pro 12.9") — each. Take from iOS Simulator: with the simulator running, **Cmd+S** saves to Desktop.
   - **Android**: 1080×1920 to 1440×2960 — phone resolution. Take from emulator: Power button in the emulator's toolbar > Screenshot.
4. Suggested screenshots: home feed, map view, a guide detail, a memory pin reveal, profile, light mode of one of these.

### Text content

| Field | Text |
|---|---|
| App name | **Brooks** |
| Subtitle (iOS, max 30 chars) | "Travel guides, your way" |
| Short description (Play, max 80 chars) | "Discover, create, and share travel guides from real travelers." |
| Long description (4000 chars max) | See template below. |
| Keywords (iOS, max 100 chars, comma-sep) | "travel,guide,trip,city,marketplace,memories,share,creator" |
| Category | **Travel** (primary). **Lifestyle** (secondary, Play Store only). |
| Content rating | Apple: 4+. Play: PEGI 3 / Everyone. (Will be confirmed by questionnaire — see 4.4.) |
| Support URL | https://brooksweb.uk/contact |
| Marketing URL | https://brooksweb.uk |
| Privacy policy URL | https://brooksweb.uk/privacy |
| Terms of service URL | https://brooksweb.uk/terms |
| Support email | (your email — see Part 0.6) |

### Long description template

```
Brooks is a marketplace where real travelers create, sell, and share city guides — and where buyers turn those guides into actual trips with maps, schedules, and photo memories.

Discover guides for your next destination from creators who lived the city, not just visited it. Buy a guide and get an interactive day-by-day plan, a map of the places you'll go, and the option to add your own memories along the way.

Features
• Browse and buy travel guides from local creators
• Day-by-day itineraries with interactive Mapbox maps
• Place reviews, photos, and audio memories tied to GPS pins
• Share memories with friends — they unlock when they visit the place
• Light and bright themes to match your vibe
• Built on the brooksweb.uk web platform — your account works the same on web and mobile

Brooks is for travelers who want a guide written by someone who actually walked the streets, not by an algorithm.
```

## 4.2 Apple App Store listing — fill it in

In https://appstoreconnect.apple.com > My Apps > Brooks:

### App Information
- Subtitle: `Travel guides, your way`
- Category: Primary `Travel`, Secondary leave blank (or `Lifestyle`).
- Content Rights: "Does your app contain, show, or access third-party content?" — **Yes**. You're showing user-generated memories and creator-uploaded content. Then describe in the field that follows: "User-generated travel memories and creator-uploaded guides."
- Age Rating: click **Edit**, answer the questionnaire honestly. For Brooks, all answers are typically "None" → results in **4+**.

### Pricing and Availability
- Price: **Free**
- Availability: **All countries and regions** (or pick specific ones).

### App Privacy
This is the strict part. Click **Get Started** under App Privacy. Apple asks: do you collect any data?

**Yes, we collect:**
- Email address (for Auth0 login) → linked to user identity → used for App Functionality
- Name (display name on profile) → linked to user identity → used for App Functionality
- Photos (memory uploads) → linked to user identity → used for App Functionality
- Coarse location (memory unlock) → linked to user identity → used for App Functionality
- Purchase history (BOG iPay receipts) → linked to user identity → used for App Functionality

Click through Apple's questionnaire and answer "yes" + the data type for each. ⏱ ~20 minutes.

### Version 1.0.0 page
- **What's New in This Version**: `Welcome to Brooks. Browse, buy, and create travel guides on iOS for the first time.`
- **Promotional Text**: leave blank for now.
- **Description**: paste the long description from 4.1.
- **Keywords**: paste from 4.1.
- **Screenshots**: drag-drop the 6 screenshots into each device size slot.
- **App Preview** (video): leave blank for v1.0.
- **Build**: click **+ Select Build**, choose your TestFlight build from Part 2.

### App Review Information
- Sign-In Required: **Yes**.
- **Demo Account**: create a test user via brooksweb.uk Auth0. Provide their email and password to Apple in the boxes. Apple's reviewer logs in as this user to verify functionality. **The account must work; review will fail otherwise.**
- **Notes for Review**: 
```
Brooks is a travel-guide marketplace. Login is via Auth0 (Google or email). The provided demo account has full purchase access and example trips.

Test flow:
1. Open the app — you'll see the Explore feed.
2. Sign in with the demo account.
3. Tap Maps tab to see the map view with Mapbox-rendered creator pins and shared memories.
4. Tap a creator pin → Open profile → see their guides.
5. Tap a guide to see the detail page.
6. Tap Trips tab to see purchased trips with day-by-day itineraries.

The app is a Capacitor wrapper around https://brooksweb.uk. All native code is the standard Capacitor shell + @capacitor/share for native share sheets. No private API usage.
```

### Save everything.

## 4.3 Google Play Store listing — fill it in

In https://play.google.com/console/ > Brooks:

### Main store listing (left sidebar)
- **App name**: Brooks
- **Short description**: paste from 4.1.
- **Full description**: paste long description.
- **App icon**: upload 512×512 PNG (Play needs a smaller version than App Store's 1024).
- **Feature graphic**: upload 1024×500 PNG.
- **Phone screenshots**: drag-drop 4–8 phone screenshots.
- **7-inch tablet screenshots**: optional — skip for v1.0.
- **10-inch tablet screenshots**: optional — skip for v1.0.

### Store settings
- **App category**: Travel & Local
- **Tags**: Travel, Maps, Local, Guide
- **Email**: your support email
- **Phone**: optional
- **Website**: https://brooksweb.uk
- **Privacy Policy**: https://brooksweb.uk/privacy

### App content (left sidebar)
This is Play's policy compliance section. Walk through each subsection:

#### Privacy policy
Paste: `https://brooksweb.uk/privacy`. Click Save.

#### App access
"Is all functionality available without restrictions?" → **No, some functionality is restricted**. Provide:
- Username: <your demo account email>
- Password: <demo account password>
- Other access info: "Sign in with email/password via Auth0. Most features require login."

#### Ads
"Does your app contain ads?" → **No**.

#### Content ratings
Click **Start questionnaire**. Walk through. For Brooks the answers are typically all "No" → results in **PEGI 3 / Everyone**. Submit to get the rating.

#### Target audience
- **Target age**: 18+
- "Does your app appeal to children?" → **No**.

#### Data safety
This is Play's equivalent of Apple's privacy nutrition label. Same data points as 4.2's App Privacy.
- Personal info: Email, Name → collected, encrypted in transit, used for account management
- Location: Approximate location → collected, used for app functionality (memory unlock)
- Photos and videos: Photos → collected, used for app functionality (memory media)
- App activity: In-app actions → collected for app functionality
- Financial info: Purchase history → collected for app functionality (BOG iPay records)

⏱ ~20 minutes to fill out completely.

#### Government apps
"Is this a government-affiliated app?" → **No**.

#### Financial features
If your app shows real-money payments (it does — BOG iPay):
- "Does your app process payments?" → **Yes**
- Payment processor: **Other** → "Bank of Georgia iPay"

### Pricing and distribution
- **App or game**: App
- **Free**: Yes
- **Countries**: pick all (or your subset)

### Save everything.

## 4.4 Save and validate

In both consoles, every section needs a green checkmark before submission. Walk through each sidebar item — anything red or yellow needs attention.

✅ When all sections are green, you can submit.

---

# Part 5 — Submit and pass review

## 5.1 Submit iOS for review

In App Store Connect > Brooks > Version 1.0.0:

1. Make sure all sections show green checkmarks.
2. Top-right: click **Add for Review**.
3. Apple asks: "Are you sure?" → **Submit**.

⏱ Apple review queue: 1–3 business days typically. Sometimes 24 hours.

You'll receive emails:
- "Your app is being reviewed" (within hours)
- "Your app has been approved" or "Your app has been rejected" (1–3 days later)

If approved, the app moves to "Pending Developer Release" — click **Release Now** to publish, or schedule a date.

## 5.2 Submit Android for review

In Play Console > Brooks > **Production** (left sidebar):

1. Click **Create new release**.
2. **Add from library**: pick the same build you uploaded to Internal testing.
3. Fill in release notes: same as Internal.
4. **Save > Review release**.
5. **Start rollout to production**.
6. Confirm.

⏱ Play review: ~hours to 1–2 days.

You'll get emails:
- "Submitted for review"
- "Available on Google Play" or "Update rejected" (with reason)

## 5.3 Common rejection reasons

### Apple

#### "Guideline 4.2 — Minimum Functionality"
**The risk you most need to mitigate.** Apple sometimes rejects apps that look like a wrapped website. Even with `@capacitor/share` installed, you need to USE it.

**Fix**: open `web/src/components/maps/MapsExperience.tsx` and find where `navigator.share` is called (around line 917). Replace with:

```ts
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

// Replace the navigator.share call with:
if (Capacitor.isNativePlatform()) {
  await Share.share({
    title: 'Hidden Brooks memory',
    text: 'You have a hidden memory waiting for you.',
    url: share.shareUrl,
  });
} else if (navigator.share) {
  await navigator.share({
    title: 'Hidden Brooks memory',
    text: 'You have a hidden memory waiting for you.',
    url: share.shareUrl,
  });
}
```

Re-archive (Part 2.10), upload (Part 2.11), and reply to the rejection saying "We've added native share-sheet integration for memory share-links. Please re-review."

#### "Guideline 5.1.1 — Privacy: Data Collection and Storage"
You missed something in App Privacy. Re-walk Part 4.2's App Privacy section, add the missing data type, save, and respond to the rejection.

#### "Guideline 2.1 — Information Needed"
Apple's reviewer couldn't log in or use a key feature. Common cause: your demo account expired, was deleted, or doesn't have a purchased guide for the trip view. Make sure the demo account stays active and has rich data.

### Play

#### "Privacy policy violation"
Your privacy policy doesn't mention something Play sees in your app. Update https://brooksweb.uk/privacy to mention every data type you listed in Data safety.

#### "Permission policy violation"
You've requested a permission your app doesn't actually use. For v1.0 with no native plugins, this shouldn't happen.

#### "Restricted permissions" (background location)
Only relevant in Phase 2 when you add background geolocation. v1.0 should not see this.

## 5.4 What to do after launch

- Monitor crash reports: App Store Connect > **Crashes**, Play Console > **Quality > Android vitals**.
- Read every review. Reply within 48 hours.
- Tag your git repository: `git tag -a v1.0.0-mobile -m "First mobile release" && git push --tags`.

---

# Part 6 — Native plugins (Phase 2 — weeks 2–3 after launch)

Once v1.0 is live, here's the priority order for adding native features. Each plugin is a standalone 1–2 day task.

## 6.1 @capacitor/share — already installed

Already in `package.json`. Just wire it into the share flow as shown in Part 5.3 if you haven't.

## 6.2 @capacitor/camera — replace the photo upload field

Goal: tapping "Add photo" in the memory create flow opens the native camera UI instead of a generic file picker.

```bash
cd web
npm install @capacitor/camera
npx cap sync
```

Wire it in `web/src/components/media/ImageUploadField.tsx` (or wherever the `<input type="file" capture>` lives):

```tsx
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType } from '@capacitor/camera';

const takePhoto = async () => {
  if (!Capacitor.isNativePlatform()) {
    // fall through to existing web file input
    return;
  }
  const photo = await Camera.getPhoto({
    quality: 90,
    resultType: CameraResultType.Uri,
    allowEditing: false,
  });
  // upload photo.webPath to your /api/media endpoint
};
```

In `web/ios/App/App/Info.plist`, add:
```xml
<key>NSCameraUsageDescription</key>
<string>Brooks uses your camera to add photos to memories.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Brooks uses your photo library to add photos to memories.</string>
```

In `web/android/app/src/main/AndroidManifest.xml`, add:
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
```

Re-build, re-test, re-submit as v1.1.

## 6.3 @capacitor/push-notifications

Goal: send notifications when followed creators publish, when memory shares are received, etc.

### iOS prep
1. App Store Connect > Brooks > **App Information** > **Push Notifications** > enable.
2. In Xcode, Signing & Capabilities > **+ Capability** > **Push Notifications**.
3. Generate an APNs key in https://developer.apple.com/account/resources/authkeys/list. Download the `.p8` file. Note the Key ID and Team ID.

### Android prep
1. https://console.firebase.google.com → New project → "Brooks".
2. Add Android app with package `uk.brooksweb.app`.
3. Download `google-services.json`, save to `web/android/app/google-services.json`.
4. In `web/android/build.gradle`, add `classpath 'com.google.gms:google-services:4.4.0'`.
5. In `web/android/app/build.gradle`, add `apply plugin: 'com.google.gms.google-services'` at the bottom.

### Capacitor wiring
```bash
npm install @capacitor/push-notifications
npx cap sync
```

In your app's main entry (e.g., `web/src/components/layout/AppShell.tsx`), register the device:

```tsx
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

useEffect(() => {
  if (!Capacitor.isNativePlatform()) return;
  PushNotifications.requestPermissions().then((result) => {
    if (result.receive === 'granted') {
      PushNotifications.register();
    }
  });
  PushNotifications.addListener('registration', (token) => {
    api.post('/api/me/device-tokens', { token: token.value, platform: Capacitor.getPlatform() }, accessToken);
  });
}, []);
```

### Backend
Add to your Spring Boot app:
- `POST /api/me/device-tokens` — stores token + platform per user.
- Notification-send service that calls APNs (iOS) and FCM (Android) when relevant events fire.

This is a multi-day backend task — separate guide.

## 6.4 @capacitor/geolocation — foreground

```bash
npm install @capacitor/geolocation
npx cap sync
```

Find every `navigator.geolocation.getCurrentPosition` call in `web/src/`. Replace with:

```tsx
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

const getPosition = async () => {
  if (Capacitor.isNativePlatform()) {
    const pos = await Geolocation.getCurrentPosition();
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      reject
    );
  });
};
```

Add to Info.plist:
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Brooks uses your location to unlock memories that are tied to specific places.</string>
```

Add to AndroidManifest.xml:
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

## 6.5 @capacitor/app — deep links

Goal: tapping `https://brooksweb.uk/m/<token>` on a phone opens the Brooks app at that share-memory page instead of opening Safari/Chrome.

### iOS Universal Links
1. In Xcode, Signing & Capabilities > **+ Capability** > **Associated Domains**.
2. Add `applinks:brooksweb.uk`.
3. On your backend, serve at `https://brooksweb.uk/.well-known/apple-app-site-association` (no extension):
```json
{
  "applinks": {
    "details": [
      {
        "appIDs": ["<YOUR_TEAM_ID>.uk.brooksweb.app"],
        "components": [
          { "/": "/m/*" }
        ]
      }
    ]
  }
}
```
Replace `<YOUR_TEAM_ID>` with your Apple Team ID (find at https://developer.apple.com/account/#/membership).

### Android App Links
1. In `AndroidManifest.xml` inside the main `<activity>`:
```xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="https" android:host="brooksweb.uk" android:pathPattern="/m/.*" />
</intent-filter>
```
2. On your backend, serve at `https://brooksweb.uk/.well-known/assetlinks.json`:
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "uk.brooksweb.app",
    "sha256_cert_fingerprints": ["<YOUR_KEYSTORE_SHA256>"]
  }
}]
```
Get your SHA256 fingerprint:
```bash
keytool -list -v -keystore ~/Documents/brooks-keys/brooks-release.keystore -alias brooks
```
Copy the SHA256 line and paste it into the JSON.

### Capacitor wiring
```bash
npm install @capacitor/app
npx cap sync
```

In your app's root, listen for URL opens:
```tsx
import { App } from '@capacitor/app';
import { useRouter } from 'next/navigation';

useEffect(() => {
  if (!Capacitor.isNativePlatform()) return;
  const sub = App.addListener('appUrlOpen', (event) => {
    const url = new URL(event.url);
    if (url.pathname.startsWith('/m/')) {
      router.push(url.pathname);
    }
  });
  return () => { sub.remove(); };
}, []);
```

---

# Part 7 — Updating and shipping new versions

When you make code changes:

### iOS
1. Edit code, push to brooksweb.uk (deploy as you normally do).
2. The mobile app reflects the change instantly — no rebuild needed for web changes (sub-path 2A loads remote).
3. **Only re-archive when**: changing native code (Capacitor plugins, Info.plist permissions, app icon, splash, version number).
4. Bump `Bundle version (CFBundleVersion)` in Info.plist by 1 each time you upload a new build.
5. Bump `Bundle version string (CFBundleShortVersionString)` for user-facing version (1.0.0 → 1.0.1 → 1.1.0).
6. Repeat Part 2.10 onward.

### Android
1. Same — web changes are instant.
2. For native rebuilds: bump `versionCode` and `versionName` in `web/android/app/build.gradle`.
3. `./gradlew bundleRelease` → upload .aab → roll out to Production.

### Versioning tip
- `versionCode` (Android) and `Bundle version` (iOS) — integer, monotonically increasing, never reuse.
- `versionName` (Android) and `Bundle version string` (iOS) — semantic version like `1.0.0` for users.

---

# Part 8 — Troubleshooting

### iOS

**"Build input file cannot be found: ... GoogleService-Info.plist"**  
You enabled Push Notifications capability without setting up Firebase. Either complete Part 6.3 or remove the capability.

**"App installation failed: A higher version of this application is already installed"**  
Uninstall Brooks from your iPhone, then re-install from Xcode.

**"The app references non-public selectors"**  
A Capacitor plugin uses something Apple doesn't allow. Update Capacitor: `npm install @capacitor/core@latest @capacitor/cli@latest @capacitor/ios@latest && npx cap sync`.

**Splash screen sticks forever**  
Your `server.url` is unreachable. Check brooksweb.uk loads in mobile Safari.

**TestFlight: "This app cannot be installed because its integrity could not be verified"**  
TestFlight build expired (90 days). Upload a new build.

### Android

**"INSTALL_FAILED_INSUFFICIENT_STORAGE"**  
Phone is full. Free space and retry.

**"Default Activity not found"**  
Gradle sync didn't finish. File > Sync Project with Gradle Files. Wait for completion.

**"Execution failed for task ':app:lintVitalRelease'"**  
Lint found a problem. Open the lint report (path is in the error message), fix the issue, rebuild.

**"Keystore was tampered with, or password was incorrect"**  
Re-set environment variables (Part 3.8). Open a fresh terminal.

**Black screen on first launch**  
Same as iOS: server.url unreachable, or sub-path 2A misconfigured. Verify `capacitor.config.ts`.

### Both

**"Mapbox tiles don't load"**  
The token in `NEXT_PUBLIC_MAPBOX_PUBLIC_TOKEN` doesn't have permissions for the style. Open Mapbox Studio > Account > Tokens, ensure your public token has the "Maps: Read" scope and includes both `mapbox://styles/mapbox/dark-v11` and `mapbox://styles/mapbox/standard` styles enabled.

**Auth0 redirect doesn't return to the app**  
For v1.0 sub-path 2A, the redirect happens inside the WebView so it Just Works™. If it doesn't, the WebView is rejecting the cross-origin redirect. Check `limitsNavigationsToAppBoundDomains` in `capacitor.config.ts` is `true`, and that brooksweb.uk and your Auth0 tenant domain are both listed in `WKAppBoundDomains` in Info.plist:

```xml
<key>WKAppBoundDomains</key>
<array>
  <string>brooksweb.uk</string>
  <string>dev-4zduxht0r6gq1f7f.us.auth0.com</string>
</array>
```

---

# Part 9 — Glossary

| Term | Meaning |
|---|---|
| **Bundle ID** (iOS) / **Package name** (Android) | The unique identifier for your app. Yours is `uk.brooksweb.app`. |
| **Capacitor** | The library that wraps your web app inside a native shell. Made by Ionic. |
| **WebView** | The "browser inside the app" that shows your website. iOS uses WKWebView, Android uses WebView. |
| **Provisioning profile** | A signed file from Apple that says "Boris Solomonia is allowed to install apps with bundle ID uk.brooksweb.app on devices." Auto-managed by Xcode. |
| **Keystore** | An encrypted file holding cryptographic keys that prove you (and only you) signed the Android app. Lose it = lose the ability to update. |
| **Universal Link / App Link** | A regular https:// URL that opens your app instead of the browser when tapped on a phone. |
| **TestFlight** | Apple's beta-distribution service. Up to 100 internal testers + 10,000 external. |
| **Internal Testing** (Play) | Google's equivalent of TestFlight for early access. |
| **App Store Connect** | Apple's web dashboard for managing app listings, builds, reviews. |
| **Play Console** | Google's equivalent. |
| **APNs** | Apple Push Notification service. |
| **FCM** | Firebase Cloud Messaging — Android's push service (also handles APNs from one codebase). |
| **Build number / versionCode** | An integer that goes UP every upload (1, 2, 3, …). Even if user-facing version stays at 1.0.0, build number changes. |
| **Version name / versionName** | Semantic version users see: 1.0.0, 1.1.0, 2.0.0. |
| **AAB (Android App Bundle)** | The new format Google requires (`.aab`). Replaces the old `.apk` for Play Store uploads. |
| **CocoaPods** | Dependency manager for iOS native code. Capacitor uses it under the hood. |
| **xcworkspace vs xcodeproj** | Always open the .xcworkspace file in Xcode. The .xcodeproj alone doesn't include CocoaPods dependencies. |
| **Sub-path 2A** | "Capacitor with remote URL" — the WebView loads brooksweb.uk live. The chosen path for v1.0. |
| **Sub-path 2B** | "Capacitor with static export" — the Next.js site is bundled into the app. A future migration option, not v1.0. |

---

# Appendix A — Quick reference cheat sheet

For the impatient who already read the guide once.

```bash
# Setup (once per machine)
brew install node@20 git temurin@17
brew install --cask android-studio
sudo gem install cocoapods

# Project (once)
cd ~/Documents/brooks-prequel/web
npm install

# iOS native shell (once)
npx cap add ios
npx cap open ios
# In Xcode: signing → team → archive → distribute → App Store

# Android native shell (once)
npx cap add android
keytool -genkey -v -keystore brooks-release.keystore -alias brooks -keyalg RSA -keysize 2048 -validity 10000
mv brooks-release.keystore ~/Documents/brooks-keys/
npx cap open android
# In Android Studio: configure signing → bundleRelease

# Icons + splash (whenever logo changes)
npm run cap:assets

# Sync after Capacitor config changes
npx cap sync

# Build commands
cd ../android && ./gradlew bundleRelease       # Android
# iOS uses Xcode UI: Product > Archive

# Version bumps before re-archive
# iOS: Info.plist → Bundle version (CFBundleVersion) and Bundle version string
# Android: web/android/app/build.gradle → versionCode and versionName
```

---

# Appendix B — File reference

| File | Purpose | Touched by |
|---|---|---|
| `web/capacitor.config.ts` | Capacitor app config (bundle ID, server URL, iOS/Android settings) | `npx cap init`, manual edits |
| `web/capacitor-fallback/index.html` | Offline placeholder shown if brooksweb.uk is unreachable | Capacitor uses as `webDir` |
| `web/MOBILE_SETUP.md` | Quick reference (briefer than this guide) | Created by Claude during scaffolding |
| `web/MOBILE_GUIDE.md` | This file | You're reading it |
| `web/ios/App/App.xcworkspace` | The Xcode project | `npx cap add ios` |
| `web/ios/App/App/Info.plist` | iOS app metadata, permissions, version | Manual edits in Xcode |
| `web/android/` | The Android Studio project | `npx cap add android` |
| `web/android/app/build.gradle` | Android signing config, version, dependencies | Manual edits |
| `web/android/app/src/main/AndroidManifest.xml` | Android permissions, intent filters, package name | Manual edits |
| `web/android/app/google-services.json` | Firebase config (Phase 2 only) | Downloaded from Firebase Console |
| `~/Documents/brooks-keys/brooks-release.keystore` | Android signing key — DO NOT LOSE | Created by you in Part 3.7 |

---

# Appendix C — When you need help

- **Capacitor docs**: https://capacitorjs.com/docs
- **Apple Developer support**: https://developer.apple.com/contact/
- **Google Play Console support**: Play Console > Help icon (top-right) > Contact support
- **Mapbox status**: https://status.mapbox.com/
- **Auth0 docs for native**: https://auth0.com/docs/quickstart/native
- **Stack Overflow** for code-level errors — search the exact error message in quotes.

---

**Last updated**: 2026-05-10  
**Stack assumed**: Capacitor 6.2.x, Node 20, JDK 17, Xcode 15+/16+, Android Studio Hedgehog+ (or newer).  
**Bundle ID locked**: uk.brooksweb.app  
**Sub-path locked**: 2A (remote URL — WebView loads brooksweb.uk).
