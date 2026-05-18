# Firebase Setup for Brooks Android Push Notifications

**Goal:** create the Firebase project that powers FCM (Firebase Cloud
Messaging) push notifications on Android. ~10 minutes total. Done once.

**Output:** two JSON files you'll drop into the repo:
1. `google-services.json` → `web/android/app/google-services.json`
2. `brooks-firebase-admin.json` → `backend/app/src/main/resources/firebase-admin.json`

---

## Step 1 — Create the Firebase project (3 min)

1. Open <https://console.firebase.google.com>
2. Sign in with the Google account you want to own the project
3. Click **Add project** (or "Create a project")
4. Project name: **Brooks** (or any name — doesn't have to match the
   Android bundle ID)
5. Skip "Enable Google Analytics" — **toggle it OFF**. Analytics adds
   complexity and is unnecessary for push.
6. Click **Create project** → wait ~30 seconds → click **Continue**

You're now on the project dashboard.

## Step 2 — Add the Android app to the project (3 min)

On the project dashboard:

1. Click the **Android** icon (under "Get started by adding Firebase to
   your app")
2. **Android package name:** `uk.brooksweb.app`
   (this MUST match `applicationId` in `web/android/app/build.gradle`
   — already set in the repo)
3. **App nickname:** `Brooks Android` (or any label — internal only)
4. **SHA-1 signing certificate:** leave blank for now. Required for
   Sign in with Google later, NOT required for push notifications.
5. Click **Register app**

## Step 3 — Download google-services.json (2 min)

After registering, Firebase shows a "Download google-services.json"
button.

1. Click **Download google-services.json**
2. Move the downloaded file to:
   ```
   C:\Users\Boris\Dell\Projects\APPS\Brooks_prequel\web\android\app\google-services.json
   ```
3. **Verify the file is in the right place:**
   ```powershell
   ls C:\Users\Boris\Dell\Projects\APPS\Brooks_prequel\web\android\app\google-services.json
   ```
4. Click **Next** on the Firebase wizard. It will show you Gradle
   snippets — **skip those**, I've already added the equivalent to
   `web/android/build.gradle` and `web/android/app/build.gradle`.
5. Click **Next** → **Next** → **Continue to console**

> **Why this file is gitignored:** it contains your Firebase project's
> public-but-sensitive config (API key, project ID, sender ID). Safe
> to commit for open-source projects, but for a closed product it's
> hygienic to keep it out of git. The repo has it in `.gitignore`
> already (added during this Brooks notification setup).

## Step 4 — Generate the backend service-account key (2 min)

The Spring backend needs admin credentials to SEND notifications. This
is a separate JSON from google-services.json.

1. In Firebase Console, click the gear icon ⚙️ (top-left, next to
   "Project Overview") → **Project settings**
2. Click the **Service accounts** tab
3. Scroll down → click **Generate new private key**
4. Confirm by clicking **Generate key**
5. A JSON file downloads. **Rename it** to:
   ```
   firebase-admin.json
   ```
6. Move it to:
   ```
   C:\Users\Boris\Dell\Projects\APPS\Brooks_prequel\backend\app\src\main\resources\firebase-admin.json
   ```
7. **Verify:**
   ```powershell
   ls C:\Users\Boris\Dell\Projects\APPS\Brooks_prequel\backend\app\src\main\resources\firebase-admin.json
   ```

> **NEVER commit this file.** It grants full admin access to your
> Firebase project — anyone with this file can send notifications as
> Brooks, read all data, anything. The repo has it gitignored. For
> production, you'll inject it via environment variable or mount it
> as a Kubernetes secret. For dev, a file is fine.

## Step 5 — Tell me you're done (so I can verify build)

Once both files are in place, reply with "Firebase JSONs in place"
and I'll run the verify commands and walk you through the next
batch (event listeners + memory share-to-follower UI).

You can also independently test the Android build right now:

```powershell
cd C:\Users\Boris\Dell\Projects\APPS\Brooks_prequel\web
npx cap sync android
cd android
.\gradlew bundleRelease
```

If the build succeeds, FCM is correctly wired. If it complains about
missing `google-services.json`, the file isn't in `web/android/app/`.

---

## Troubleshooting

### Gradle build fails with "File google-services.json is missing"

Path is wrong. It must be in `web/android/app/` not `web/android/` or
`web/`. Move it.

### Gradle build fails with "package name doesn't match"

The package name inside google-services.json doesn't match
`applicationId` in `web/android/app/build.gradle`. Both must be
`uk.brooksweb.app`. If they're different, you registered the wrong
package name in Firebase — delete the Android app entry in Firebase
console, re-register with `uk.brooksweb.app`, re-download.

### "Failed to find application" when running

Make sure you ran `npx cap sync android` AFTER dropping
google-services.json. The sync step copies the Capacitor config
through; without it the build is using stale Capacitor metadata.

---

## What this enables

After Firebase is set up + the code I'm building lands:

1. **Token registration** — every time you open the app, the device
   gets an FCM token. The frontend POSTs it to
   `/api/me/device-tokens` and the backend stores it linked to your
   user.
2. **Notification sending** — when a relevant event fires on the
   backend (purchase, follow, memory direct-share), Spring looks up
   all device tokens for the target user and pushes a notification
   via FCM. Android shows it in the system tray.
3. **Tap to open** — tapping the notification opens Brooks and routes
   to the relevant screen (e.g. the new memory).

For iOS later you'll register the same app in Firebase for iOS, drop
GoogleService-Info.plist into the iOS project, and add APNs auth key
from Apple Developer Console. Different setup but same backend code.
