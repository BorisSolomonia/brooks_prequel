# Debug the Brooks Android App — PowerShell Edition

One terminal. One command. Every log line — Java, Capacitor plugin
calls, every JS `console.log`, Mapbox warnings, Chromium renderer
crashes — all streamed live to PowerShell. No Chrome DevTools
attachment needed. No SSH to the VM.

**Tested:** Pixel 9a, Android 14/15, Windows 11, last updated 2026-05-22.

---

## Step 1 — One-time setup (do once per laptop)

### 1.1 Install Android Studio

Just for the bundled `adb.exe`. You won't open the IDE.

1. Download from <https://developer.android.com/studio>
2. Run installer. Pick **Standard** install. Wait ~5 minutes for the SDK download.
3. Close Android Studio when it finishes.

ADB lands at:

```
%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe
```

Verify:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" version
```

Output should start with `Android Debug Bridge version 1.0.x`.

### 1.2 Enable USB debugging on the phone

1. Settings → **About phone** → tap **Build number** seven times.
2. Toast says "You are now a developer."
3. Back out → Settings → **System** → **Developer options** now exists.
4. In Developer options, toggle **USB debugging** ON.
5. (Recommended) also toggle **Stay awake** ON so the screen doesn't sleep while plugged in.

### 1.3 Use a data-carrying USB cable

Many random cables are charge-only. Use the cable that came with the
phone, or a known-good data cable. If `adb devices` later shows
nothing, swap the cable.

---

## Step 2 — Connect the phone (every session, ~30 seconds)

### 2.1 Plug the phone in

USB-C to phone, USB-A or USB-C to laptop.

### 2.2 Set the phone's USB mode to "File transfer"

Pull the notification shade down on the phone. Tap "Charging this
device via USB" → choose **File transfer**. (Yes, even though you're
not transferring files — that's the mode that makes ADB visible.
"Charging only" mode hides ADB.)

### 2.3 Open PowerShell and define `$adb`

Paste these two lines:

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb devices
```

What you want to see:

```
List of devices attached
58051JEBF08550  device
```

If you see `unauthorized` instead of `device`: look at the phone — a
"Allow USB debugging" dialog is waiting. Tap **Allow** (tick "Always
allow from this computer").

If the list is empty: bad cable, wrong USB mode, or driver issue. See
**Step 6 — Troubleshooting** at the bottom.

---

## Step 3 — Install the debug build (every fresh code change)

The **release** APK from Play Store has WebView debugging disabled
AND its console messages can't be read via logcat. You need the
**debug** APK — Capacitor pipes every `console.log` into logcat under
the tag `Capacitor/Console` in debug builds.

```powershell
cd C:\Users\Boris\Dell\Projects\APPS\Brooks_prequel\web\android
.\gradlew assembleDebug
& $adb uninstall uk.brooksweb.app
& $adb install -r app\build\outputs\apk\debug\app-debug.apk
```

Expected output ends with `Success`.

You'll need to sign into Brooks again (uninstall wiped the Auth0 session).

---

## ⭐ Step 4 — THE MAIN COMMAND: stream every log

This is what you came here for. Paste these four lines into
PowerShell, in order:

```powershell
# 1. Make sure Brooks is running on the phone
& $adb shell am start -n uk.brooksweb.app/.MainActivity

# 2. Capture Brooks's process ID. ($pid is reserved in PowerShell —
#    that's why we use $brooksPid.)
$brooksPid = (& $adb shell pidof uk.brooksweb.app).Trim()
Write-Host "Brooks PID = $brooksPid"

# 3. Optional: clear the logcat buffer so old noise doesn't appear
& $adb logcat -c

# 4. STREAM EVERY LOG LINE THE BROOKS PROCESS EMITS — and save it
#    to a file at the same time. Press Ctrl+C to stop.
& $adb logcat --pid=$brooksPid -v threadtime *:V | Tee-Object -FilePath brooks-debug.log
```

What you'll see in PowerShell looks like this:

```
05-22 14:03:21.456 28733 28733 I Capacitor/Console: File: https://brooksweb.uk/_next/static/... - Msg: [tour] step memory-form
05-22 14:03:21.612 28733 28912 D Capacitor/PluginRequest: To native: pluginId: Geolocation, methodName: getCurrentPosition
05-22 14:03:21.789 28733 28733 E chromium: Renderer process (28912) crash detected (code -1).
```

That single command gives you:

- ✅ Every `console.log` / `console.warn` / `console.error` from your
  JavaScript code (tag `Capacitor/Console`)
- ✅ Every Capacitor plugin call (Geolocation, PushNotifications,
  Browser, Share, etc.) with the JSON arguments
- ✅ Every Mapbox warning
- ✅ Every Chromium renderer crash / OOM
- ✅ Every `FATAL EXCEPTION` from the Java side
- ✅ Every FCM token registration event

In ONE PowerShell window. Ctrl+C to stop. The file `brooks-debug.log`
sits in your current directory with the whole thing for later search.

---

## Step 5 — Reproducing a freeze cleanly

For freezes specifically, this is the recipe:

```powershell
# Reset everything so old noise doesn't pollute
& $adb logcat -c

# Re-fetch the PID (it changes whenever Brooks restarts)
$brooksPid = (& $adb shell pidof uk.brooksweb.app).Trim()

# Stream + save
& $adb logcat --pid=$brooksPid -v threadtime *:V | Tee-Object -FilePath brooks-freeze.log
```

Then on the phone: **do the thing that causes the freeze.** Watch
the terminal. The last ~30 lines before the screen locks up are
your suspects. Ctrl+C the stream after the freeze.

### Freeze patterns — what to look for in the output

| Log line | What it means |
|---|---|
| `Skipped NN frames!` | Main thread blocked for NN × 16 ms. Usually Mapbox or heavy JS. |
| `Renderer process (PID) crash detected (code -1)` | WebView renderer hit OOM. Killed by the OS. |
| `kill (OOM or update) ... killing application` | App about to be force-stopped by Android. |
| `FATAL EXCEPTION` | Java-side crash. Stack trace in the next ~20 lines. |
| `Choreographer: Skipped` | UI thread stutter — slow useEffect or layout. |
| `Capacitor/Console ... [tour] ...` | One of your JS log lines. Anchor for "where in the code we are." |
| `[Violation] 'requestAnimationFrame' handler took NNms` | Single rAF callback ran longer than the frame budget. Usually Mapbox. |

If your `brooks-freeze.log` has any of these in the last 30 lines
before the freeze, paste those 30 lines back to me and we can pin
the exact cause.

---

## Step 6 — Useful filter recipes

The unfiltered stream is verbose. When you want to narrow it down:

### Only your JS console.log lines

```powershell
& $adb logcat --pid=$brooksPid Capacitor/Console:V *:S
```

`*:S` silences every tag except the ones you listed. Cleanest view
of just your JavaScript output.

### Only Capacitor plugin calls (no JS log noise)

```powershell
& $adb logcat --pid=$brooksPid Capacitor/PluginRequest:V Capacitor:V *:S
```

### Only crashes and errors

```powershell
& $adb logcat --pid=$brooksPid chromium:E AndroidRuntime:E *:S
```

### Brooks JS console + Firebase (for push-notification debugging)

```powershell
& $adb logcat Capacitor/Console:V FirebaseMessaging:V FA:V *:S
```

(Firebase messaging happens outside the Brooks process so we drop
`--pid` for this one.)

### Save the stream to a file with timestamp in the name

```powershell
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
& $adb logcat --pid=$brooksPid -v threadtime *:V | Tee-Object -FilePath "brooks-$stamp.log"
```

Each run creates a new file you can compare side-by-side.

---

## Step 7 — Troubleshooting

### `& $adb devices` shows nothing

In order of likelihood:

1. **Wrong USB mode on the phone.** Pull notification shade, change
   to "File transfer."
2. **Charge-only cable.** Swap to a known data cable.
3. **USB debugging turned itself off.** Settings → Developer options
   → toggle USB debugging.
4. **Missing Google USB driver (Windows).** Download from
   <https://developer.android.com/studio/run/win-usb>, right-click
   `android_winusb.inf` → Install. Unplug + replug the phone.

### `& $adb devices` shows `unauthorized`

Look at the phone — the "Allow USB debugging" dialog is waiting.
Tap **Allow**, tick "Always allow." If you don't see the dialog:

```powershell
# Phone → Settings → Developer options → "Revoke USB debugging authorizations"
# Then unplug, replug. Dialog reappears fresh.
```

### `pidof uk.brooksweb.app` returns nothing

The app isn't running on the phone. Tap the Brooks icon to open it,
then re-fetch:

```powershell
$brooksPid = (& $adb shell pidof uk.brooksweb.app).Trim()
```

### Logcat stream went silent

The PID changed — Brooks was force-stopped, crashed, or swiped from
recents. Ctrl+C, then re-grab the PID and restart the stream:

```powershell
$brooksPid = (& $adb shell pidof uk.brooksweb.app).Trim()
& $adb logcat --pid=$brooksPid -v threadtime *:V | Tee-Object -Append brooks-debug.log
```

`-Append` keeps both PIDs in one file across the restart.

### `assembleDebug` fails

Common causes:

- **Java not installed / wrong version.** Brooks needs JDK 17+. Get
  it from <https://adoptium.net> if needed.
- **AGP 8.2.1 / compileSdk 35 warning** — ignore, build still
  succeeds (you saw this exact warning in your last build log).

### "Cannot find `.\scripts\adb-debug.ps1`"

That convenience script is at `web\scripts\adb-debug.ps1` (the
`web/` directory, not `web/android/`). Just use the direct `& $adb`
commands in this doc — they don't depend on the script.

---

## Quick reference card

| Goal | Command |
|---|---|
| Find adb | `$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"` |
| List devices | `& $adb devices` |
| Build debug APK | `cd C:\Users\Boris\Dell\Projects\APPS\Brooks_prequel\web\android; .\gradlew assembleDebug` |
| Install debug APK | `& $adb install -r app\build\outputs\apk\debug\app-debug.apk` |
| Launch Brooks on phone | `& $adb shell am start -n uk.brooksweb.app/.MainActivity` |
| Get Brooks PID | `$brooksPid = (& $adb shell pidof uk.brooksweb.app).Trim()` |
| Stream every log + save | `& $adb logcat --pid=$brooksPid -v threadtime *:V \| Tee-Object brooks-debug.log` |
| Only JS console.log lines | `& $adb logcat --pid=$brooksPid Capacitor/Console:V *:S` |
| Only crashes / errors | `& $adb logcat --pid=$brooksPid chromium:E AndroidRuntime:E *:S` |
| Force-stop Brooks | `& $adb shell am force-stop uk.brooksweb.app` |
| Clear app data (full reset) | `& $adb shell pm clear uk.brooksweb.app` |
| Uninstall | `& $adb uninstall uk.brooksweb.app` |
| Clear logcat buffer | `& $adb logcat -c` |
| Screenshot to laptop | `& $adb exec-out screencap -p > screenshot.png` |

---

## When you're stuck — share these three things

1. The output of `& $adb devices`
2. The output of `& $adb shell dumpsys package uk.brooksweb.app | Select-String 'versionCode|granted='`
3. The last 100 lines of `brooks-debug.log` from a freeze reproduction

Paste those back and I can pin almost any bug in one pass.
