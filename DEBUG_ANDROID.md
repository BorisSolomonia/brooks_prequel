# Debug the Brooks Android App — Step by Step

A linear walkthrough from "phone is in box" to "I can see every API call,
every console.log, and every backend stack trace in real time."

**Tested:** Pixel 9a, Android 14/15, Windows 11 laptop, Chrome 122+,
GCP VM running docker compose for the backend. Last updated 2026-05-19.

---

## What you'll have at the end

Three windows open side-by-side:

1. **Chrome DevTools** — attached to the live WebView on your phone.
   Console, Network, Sources, Performance — everything you have on a
   desktop site, but pointed at the Brooks app running on the phone.
2. **PowerShell window with adb logcat** — streaming the Brooks app's
   native Android logs (Capacitor plugins, crashes, FCM events).
3. **SSH terminal into the GCP VM** — tailing the backend container's
   logs (`docker logs -f brooks-backend`).

When something breaks on the phone, you see the JS error (#1), the
native trace if there is one (#2), and the backend's view of the
request (#3). Most bugs are diagnosed in under 30 seconds with that rig.

---

## Section 1 — One-time setup (~30 minutes, do once per laptop)

### 1.1 Install Android Studio (gives you `adb`)

1. Download from <https://developer.android.com/studio>
2. Run installer, choose **Standard** install (not Custom)
3. Wait for the first-run SDK download (~5 min)
4. Close Android Studio when done — you only need it for the bundled
   `adb`. You won't open the IDE.

ADB ends up at:

- Windows: `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe`
- macOS: `~/Library/Android/sdk/platform-tools/adb`
- Linux: `~/Android/Sdk/platform-tools/adb`

Verify by running:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" version
```

You should see `Android Debug Bridge version 1.0.x`.

### 1.2 Add ADB to your PATH (optional but recommended)

So you can just type `adb` from any terminal:

**Windows (PowerShell, run once):**

```powershell
[Environment]::SetEnvironmentVariable(
  "Path",
  [Environment]::GetEnvironmentVariable("Path","User") + ";$env:LOCALAPPDATA\Android\Sdk\platform-tools",
  "User")
```

Close every open PowerShell window. Open a new one. `adb version`
should work without the full path.

### 1.3 Allow unsigned PowerShell scripts (once)

The Brooks repo ships `scripts/adb-debug.ps1`. PowerShell blocks
unsigned local scripts by default:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

### 1.4 Phone: enable Developer Options

1. Settings → **About phone**
2. Tap **Build number** 7 times
3. "You are now a developer" toast
4. Back out → Settings → **System** → **Developer options** now exists

### 1.5 Phone: enable USB debugging

1. Settings → System → Developer options
2. Toggle **USB debugging** ON
3. (Recommended) toggle **Stay awake** ON — screen won't sleep while plugged in

### 1.6 Pick a data-carrying USB cable

This trips up everyone. Many USB cables only carry power, not data.
The cable that shipped with your phone is always a data cable. Random
cables from a drawer have a 30% chance of being charge-only.

If `adb devices` later shows nothing → try a different cable.

### 1.7 Install Chrome on the laptop

You need Chrome (or any Chromium browser like Edge) for the URL
`chrome://inspect/#devices`, which is where you attach DevTools to
the WebView.

### 1.8 Install scrcpy (optional — phone screen mirror)

For visual debugging it's useful to see the phone screen on your laptop.

1. Download from <https://github.com/Genymobile/scrcpy/releases>
2. Extract `scrcpy-win64-vXX.zip` to e.g. `C:\Tools\scrcpy\`
3. With phone plugged in: `C:\Tools\scrcpy\scrcpy.exe`
4. Phone screen appears as a window. Mouse + keyboard route to the phone.

---

## Section 2 — Each session: connect the phone (~60 seconds)

### 2.1 Plug in the cable

USB-C end to phone, USB-A or USB-C to laptop.

### 2.2 Pick the right USB mode on the phone

Pull down notification shade on the phone. Look for "Charging this device
via USB" → tap it → choose **File transfer**. (Choose this even though
you're not transferring files — it's what makes ADB visible. "No data
transfer" / "Charging only" hides ADB.)

### 2.3 Start the ADB server

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb start-server
```

If Windows Firewall pops up: click **Allow access** for both Private
and Public networks. (Safe — it's just ADB on localhost.)

### 2.4 List devices

```powershell
& $adb devices
```

What you'll see (and what to do for each):

| Output | Meaning | Action |
|---|---|---|
| (empty after header) | Phone not seen | Bad cable, wrong USB mode, or missing driver — see 2.5 |
| `58051... unauthorized` | Phone sees ADB but needs your OK | Look at phone — tap **Allow USB debugging** dialog. Check "Always allow" |
| `58051... offline` | Stale session | `& $adb kill-server` then `& $adb start-server` |
| `58051... device` | ✓ Fully connected | Continue to Section 3 |

### 2.5 If `adb devices` is empty

In order of likelihood:

- **Wrong USB mode** — pull notification shade, change to "File transfer"
- **Charge-only cable** — try a different cable
- **USB debugging got disabled** — Settings → Developer options → toggle USB debugging
- **Driver missing (Windows)** — install Google USB driver from
  <https://developer.android.com/studio/run/win-usb>, right-click
  `android_winusb.inf` → Install. Replug.

### 2.6 If the "Allow USB debugging" dialog doesn't appear

- Unlock the phone first (some Android versions hide it until unlocked)
- Phone → Settings → Developer options → **Revoke USB debugging
  authorizations** → tap. Then unplug + replug the cable. Dialog will
  appear fresh.

### 2.7 Wireless mode (optional, after one wired auth)

Once you've authorized USB debugging on the cable once, you can run
without a cable:

```powershell
& $adb tcpip 5555
# Note the phone's IP (Settings → About phone → Status → IP address)
# Unplug cable
& $adb connect 192.168.x.x:5555
& $adb devices
```

---

## Section 3 — Install a DEBUG build to enable WebView DevTools

**Critical step that most people skip.** The release AAB you upload to
Play Store has WebView debugging **disabled** for security. Chrome's
`chrome://inspect` will see your phone but NOT see "WebView in
uk.brooksweb.app" — there's nothing to click.

You need a **debug APK** installed instead. Debug builds have
`WebView.setWebContentsDebuggingEnabled(true)` baked in.

### 3.1 Build the debug APK on your laptop

```powershell
cd C:\Users\Boris\Dell\Projects\APPS\Brooks_prequel\web\android
.\gradlew assembleDebug
```

Takes ~2 minutes the first time, ~30 seconds after. The APK lands at:

```
web\android\app\build\outputs\apk\debug\app-debug.apk
```

### 3.2 Uninstall the release version first

Release and debug builds have different signatures — they can't
overwrite each other:

```powershell
& $adb uninstall uk.brooksweb.app
```

### 3.3 Install the debug APK

```powershell
& $adb install -r app\build\outputs\apk\debug\app-debug.apk
```

You should see `Success`.

### 3.4 Sign in again

The uninstall wiped your Auth0 session. Open Brooks, tap Get Started,
sign in.

> **When you're done debugging:** reinstall the release AAB from Play
> Store internal testing to get back to the production-signed version
> (or just keep using the debug build — it works, just isn't
> production-signed).

---

## Section 4 — Open Chrome DevTools (the main event)

### 4.1 Open the app

Brooks must be in the **foreground** on the phone for the WebView to
appear in the inspect listing.

### 4.2 Open chrome://inspect on your laptop

In Chrome, type into the address bar:

```
chrome://inspect/#devices
```

Within 5 seconds you should see:

```
Remote Target
  #LOCALHOST
  Pixel 9a
  #58051JEBF08550
    WebView in uk.brooksweb.app
    https://brooksweb.uk/maps                    [inspect] [pause]
```

Click **inspect**. DevTools opens, pointed at the live WebView.

### 4.3 If you see the phone but NO "WebView in uk.brooksweb.app"

- You're on the release APK, not the debug build. Go back to Section 3.
- App isn't running on the phone → open it.
- App is in background → bring it foreground.

### 4.4 If you see "Pending authentication"

- Look at the phone — the "Allow USB debugging" dialog is waiting.
- Or: re-do Section 2.6 (revoke + replug).

---

## Section 5 — Useful DevTools panels for Brooks bugs

### 5.1 Console — read app log lines

Brooks logs use bracketed prefixes:

- `[PermissionsBootstrap]` — permission dialogs, FCM token capture, device token POST
- `[memory]` — memory save flow
- `[tour]` — onboarding tour navigation
- `[Brooks]` — root error boundary

Filter the console by typing one of these into the filter box.

### 5.2 Network — see every API call

Filter by URL substring:

- `device-tokens` — FCM token registration
- `notifications` — bell dropdown fetch
- `memories` — map memory fetches + save
- `auth` — Auth0 callback

For each request: click it → Headers tab shows status + headers,
Response tab shows the body. If status is non-200, the response body
usually has the backend error message.

### 5.3 Application → Local Storage → https://brooksweb.uk

Useful keys:

- `brooks.fcmToken.v1` — the FCM token your device registered (long
  string starting with letters/numbers, ending with a colon).
  If `null` → the app never got a token from Firebase.
- `brooks.permissionsBootstrap.v2` — `'1'` means we already asked for
  permissions on this install.
- `brooks.onboarding.completed` — `'true'` after the tour finishes.
- `brooks.proximityFired.YYYY-MM-DD` — list of memory IDs that fired
  proximity notifications today.

### 5.4 Performance — record a slow interaction

Click the record dot, do the slow thing on the phone, click stop. You
get a frame-by-frame breakdown of what the main thread was doing.
Most useful for tour freezes or map performance bugs.

---

## Section 6 — Native logs (the second window)

Some things never appear in DevTools because they happen below the
WebView (Capacitor plugins, FCM delivery, Android crashes). For those,
tail `logcat`:

### 6.1 Brooks-only filtered logs

```powershell
.\scripts\adb-debug.ps1 logs
```

(From `web\` directory.) Filters to just the Brooks app's process.
Ctrl+C to stop.

### 6.2 Just Capacitor + Chromium console

```powershell
.\scripts\adb-debug.ps1 console
```

Same content as the DevTools Console tab but in the terminal — useful
when DevTools won't attach.

### 6.3 What to look for

- `Capacitor: To Native -> Geolocation requestPermissions` → location
  dialog is firing
- `Capacitor: Plugin <X> not implemented on android` → the plugin's
  native Java isn't bundled (forgot `npx cap sync android`)
- `FATAL EXCEPTION` → app crashed. Next 20 lines are the stack trace.

---

## Section 7 — Backend logs (the third window)

For the full picture, SSH into the GCP VM and tail the backend logs
while doing things on the phone:

### 7.1 Connect to the VM

```bash
ssh <your-user>@<vm-host>
```

### 7.2 Tail the backend container

```bash
docker logs -f brooks-backend
```

Leave this running. Press Ctrl+C when done.

### 7.3 Useful searches in past logs

Find every error in the last 500 lines:

```bash
docker logs --tail 500 brooks-backend 2>&1 | grep -B 2 -A 20 "ERROR"
```

Find every device-token POST:

```bash
docker logs --tail 500 brooks-backend 2>&1 | grep -A 30 "device-tokens"
```

Confirm Firebase initialized at startup:

```bash
docker logs brooks-backend 2>&1 | grep -i firebase
```

Expected: `"Firebase initialized from class path resource [firebase-admin.json]"`

If it says `"Firebase credentials not found"` → push notifications
are disabled because the JSON wasn't mounted into the container.

### 7.4 Dump to file for offline reading

```bash
docker logs --tail 2000 brooks-backend > /tmp/backend.log
less /tmp/backend.log
# In less: type /searchterm and Enter, n to find next, q to quit
```

---

## Section 8 — Brooks-specific debug recipes

### 8.1 "Notification never arrives when someone follows me"

Run this checklist in order — stop at the first failure.

**Phone side** (laptop terminal):

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb shell dumpsys package uk.brooksweb.app | Select-String 'versionCode|granted=|POST_NOTIFICATIONS'
```

Look for:

- `versionCode=N` — should match your latest build
- `android.permission.POST_NOTIFICATIONS: granted=true` — if `false`,
  Android silently drops every push. Fix in Settings → Apps → Brooks
  → Notifications.

**FCM token captured?** In DevTools Console (Section 5.3):

```javascript
localStorage.getItem('brooks.fcmToken.v1')
```

- Non-null string → token captured ✓
- `null` → google-services.json wasn't in the AAB. Rebuild.

**Token registered with backend?** DevTools Network tab → filter
"device-tokens" → look for `POST /api/me/device-tokens` → status 204
= success. 500 = backend error (see Section 8.2).

**Self-send a test push** in DevTools Console:

```javascript
const r = await fetch('/api/me/test-notification', { method: 'POST' });
console.log(r.status, await r.json());
```

Within 5 sec, phone shows "Brooks test" push. If yes → FCM pipeline
works end-to-end; the follow-event listener is the issue.

**Backend log when friend follows you** (VM terminal):

```bash
docker logs -f brooks-backend
# Friend taps Follow on your profile
# Look for: "FCM sent (id=...) to <masked-token>"
```

If you see that line → backend pushed. If push didn't reach phone:
- POST_NOTIFICATIONS denied (check above)
- Token in DB is stale (force-stop + reopen app to re-register)

If you DON'T see that line → `FollowNotificationListener` never ran.
Means the notification module isn't deployed. Check:

```bash
docker exec brooks-backend find /app -name "notification-*.jar"
```

If empty → module wasn't in the deploy. Trigger a fresh deploy:

```bash
git commit --allow-empty -m "Rebuild backend"
git push
```

### 8.2 "/api/me/device-tokens returns 500"

If backend logs show:

```
NoResourceFoundException: No static resource api/me/device-tokens
```

This means Spring has no controller mapped for that path → notification
module isn't in the deployed JAR. Run:

```bash
docker exec brooks-backend find /app -name "notification-*.jar"
```

If empty → fresh deploy needed. The image was built before the module
was added.

If the JAR IS there but you still get the error → component scan
isn't picking it up. Check Spring's startup banner for:

```bash
docker logs brooks-backend 2>&1 | grep -i "Mapped.*device-tokens"
```

Should show: `Mapped "{POST [/api/me/device-tokens]}" onto DeviceTokenController#register`

### 8.3 "Memory upload fails"

DevTools Console while uploading:

- `[memory] save POST failed: ...` — backend rejected. The error
  message is in the catch.
- `[ImageUploadField] upload failed: ...` — media upload failed.
  Most common: GCS credentials missing (backend log says
  `Could not save media locally`).

Backend log:

```bash
docker logs --tail 100 brooks-backend 2>&1 | grep -i "Could not save\|GCS"
```

### 8.4 "App crashes on first launch"

DevTools won't attach to a crashed app. Use logcat:

```powershell
.\scripts\adb-debug.ps1 logs
```

Open the app. If it crashes, look for `FATAL EXCEPTION` in the
output. The next 20 lines are the Java stack trace.

If the app reaches React but errors out, the root error boundary
catches it. After a reload, in DevTools Console:

```javascript
window.__brooksErrors
```

Array of every caught error with timestamps + stack traces.

### 8.5 "Tour / onboarding step freezes"

DevTools Console → filter `[tour]` → see which step entered, which
selector it's polling for.

DevTools Performance → record while clicking Next on the slow step →
see what the main thread was doing.

### 8.6 "Icon shows wrong on home screen"

Pixel launcher caches icons aggressively:

```powershell
& $adb shell pm clear com.google.android.apps.nexuslauncher
& $adb reboot
```

Wait for phone to come back up. Icon should now be correct.

---

## Quick reference — the commands you'll use 80% of the time

| Goal | Command |
|---|---|
| Start ADB | `& $adb start-server` |
| Check phone is connected | `& $adb devices` |
| Open Chrome DevTools | `chrome://inspect/#devices` (in Chrome) |
| Build debug APK | `cd web\android; .\gradlew assembleDebug` |
| Install debug APK | `& $adb install -r app\build\outputs\apk\debug\app-debug.apk` |
| Tail Brooks native logs | `.\scripts\adb-debug.ps1 logs` |
| Tail just JS console | `.\scripts\adb-debug.ps1 console` |
| Check installed version + permissions | `& $adb shell dumpsys package uk.brooksweb.app \| Select-String 'versionCode\|granted='` |
| Backend tail | `docker logs -f brooks-backend` (on VM) |
| Backend search | `docker logs --tail 500 brooks-backend 2>&1 \| grep -A 20 "<term>"` (on VM) |
| Force-stop app | `.\scripts\adb-debug.ps1 stop` |
| Clear app data (force fresh state) | `.\scripts\adb-debug.ps1 clear` |
| Screenshot | `.\scripts\adb-debug.ps1 screenshot` |
| Screen mirror | `scrcpy` (from scrcpy folder) |

---

## When you're really stuck

Send me three things:

1. The output of `& $adb shell dumpsys package uk.brooksweb.app | Select-String 'versionCode|granted='`
2. The DevTools Console output for the last 30 seconds (right-click → Save as → paste)
3. The relevant chunk of `docker logs --tail 200 brooks-backend` from the VM

Between those three I can pinpoint any remaining bug in one pass.
