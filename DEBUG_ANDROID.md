# Debugging the Brooks Android App from Your Laptop

**A complete, beginner-friendly guide. Last updated 2026-05-17.**

Tested with: Pixel 7+ on Android 13/14/15, Windows 11 laptop, Chrome 122+,
Android Studio Hedgehog (2023.1.1) or newer, Capacitor 6.2.

---

## Why this guide exists

Brooks is a Capacitor 2A app — a thin Android shell wrapping a live
WebView pointed at `https://brooksweb.uk`. When something breaks on the
phone, the easiest way to debug it is to connect the phone to your
laptop over USB and open Chrome DevTools against the running WebView.
That gives you the **exact same** tools you use to debug a website —
Console, Network, Sources, breakpoints, Performance — but pointed at
the live app on your phone.

This guide takes you from a brand-new laptop with nothing installed
all the way to a working DevTools window inspecting the app.

---

## Table of contents

1. [What you need](#1-what-you-need)
2. [Install Android Studio (gets you ADB)](#2-install-android-studio-gets-you-adb)
3. [Enable Developer Options on the phone](#3-enable-developer-options-on-the-phone)
4. [Enable USB debugging on the phone](#4-enable-usb-debugging-on-the-phone)
5. [Pick the right cable](#5-pick-the-right-cable)
6. [First connection + authorize](#6-first-connection--authorize)
7. [Verify it worked](#7-verify-it-worked)
8. [Add ADB to your PATH (so `adb` works in any terminal)](#8-add-adb-to-your-path)
9. [The Brooks helper script — `adb-debug.ps1`](#9-the-brooks-helper-script)
10. [Chrome DevTools attached to the WebView (the main event)](#10-chrome-devtools-attached-to-the-webview)
11. [ADB logcat (for native crashes the WebView can't see)](#11-adb-logcat-for-native-crashes)
12. [Wireless debugging (no cable)](#12-wireless-debugging-no-cable)
13. [Common commands cheatsheet](#13-common-commands-cheatsheet)
14. [Troubleshooting](#14-troubleshooting)
15. [Debugging the actual Brooks issues](#15-debugging-the-actual-brooks-issues)

---

## 1. What you need

**Hardware:**
- A laptop (Windows 11 in this guide; macOS / Linux notes inline where they differ)
- An Android phone (Pixel 7+ recommended for testing Brooks; any Android 13+ works)
- A USB-C cable that supports **data** (not just charging — see [section 5](#5-pick-the-right-cable))

**Software (everything is free):**
- **Android Studio** — gives you ADB (Android Debug Bridge), the SDK,
  and platform tools. ~10 GB download.
- **Google Chrome** (latest version) — for `chrome://inspect/#devices`,
  which is the main debugging window.
- **PowerShell** (already on Windows 11) or **Git Bash** if you prefer.

No Android Studio? You can install only the standalone `platform-tools`
from
<https://developer.android.com/studio/releases/platform-tools> — that
ships ADB without the GUI. But Android Studio gives you crash dump UIs
and the emulator if you ever want to test without a real device, so
it's worth the disk space.

---

## 2. Install Android Studio (gets you ADB)

> **Skip this section if you already installed Android Studio when
> setting up the Brooks Android project.** Run `adb version` in any
> terminal — if it prints a version, you're done with section 2 and 8.
> If "command not found", continue.

### 2.1 Download

1. Go to <https://developer.android.com/studio>
2. Click the big green **Download Android Studio** button
3. Accept the licence
4. Run the installer. Default settings are fine.

### 2.2 First-run setup wizard

On first launch:

1. **Choose "Standard" installation** (NOT custom). This installs
   the latest SDK + platform-tools.
2. Pick a UI theme (cosmetic, no effect).
3. Click **Next** through the rest. Final screen shows what it will
   download — click **Finish**.
4. Wait. This downloads ~6 GB and takes 5-30 min depending on your
   connection.
5. When the welcome screen appears, you can close Android Studio. You
   don't need to leave it open for ADB to work.

### 2.3 Confirm ADB installed

ADB lives at:
- **Windows:** `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe`
- **macOS:** `~/Library/Android/sdk/platform-tools/adb`
- **Linux:** `~/Android/Sdk/platform-tools/adb`

Open PowerShell and run:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" version
```

You should see something like:

```
Android Debug Bridge version 1.0.41
Version 35.0.2-12147458
Installed as C:\Users\YourName\AppData\Local\Android\Sdk\platform-tools\adb.exe
```

If you do — great, ADB is installed. [Skip to section 3.](#3-enable-developer-options-on-the-phone)

If you see "the file specified was not found" — Android Studio installed
to a non-default location. Open Android Studio → More Actions → SDK
Manager → look for **Android SDK Location** at the top of the page;
the platform-tools folder is inside it.

---

## 3. Enable Developer Options on the phone

This is the one-time toggle that unlocks the menus we need.

1. Open **Settings** on the phone
2. Scroll down to **About phone** (sometimes nested under **System** →
   **About phone**)
3. Find the **Build number** row near the bottom
4. **Tap it 7 times in a row**
5. After tap 3-4, the OS shows "You are now N steps away from being a
   developer". Keep tapping.
6. After tap 7, it says **"You are now a developer!"** and may ask for
   your screen-lock PIN to confirm — enter it.
7. Press the back arrow. You'll now see **Developer options** under
   **System** in Settings.

---

## 4. Enable USB debugging on the phone

1. Settings → **System** → **Developer options**
2. Toggle **USB debugging** to ON
3. Confirm the popup that warns USB debugging is for development
4. While you're here, also turn ON **Stay awake** — your screen won't
   sleep while the phone is plugged in, which makes debugging less
   annoying
5. (Optional but recommended) Find **Default USB configuration** and
   set it to **File transfer (MTP)** — some cables refuse to expose
   ADB unless this is set

> **What about the security warning?** Yes, USB debugging gives any
> computer your phone trusts the ability to install/uninstall apps
> and read files. **Only trust your own laptop.** Don't enable USB
> debugging at a coffee shop and plug into the airport charger.

---

## 5. Pick the right cable

This trips up almost every beginner. **Not all USB cables carry data.**
Some are charge-only — they have power pins but no data pins.

How to tell:

- **Cable that came with your phone in the box** → almost always data.
- **Cable bundled with a small charger or accessory** → might be charge-only.
- **Random cable from a drawer** → roll the dice.

**The test:** plug the phone into the laptop. After USB debugging is
on (section 4), a dialog appears on the phone asking if you want to
allow USB debugging from this computer (section 6 covers this). **If
no dialog appears AND the phone never shows up in `adb devices`,
your cable is charge-only.** Try another.

USB-C to USB-C cables for laptop with USB-C ports work fine. USB-C to
USB-A (the rectangular USB) also works if your laptop has the older
ports. Just confirm "data" is in the cable's listing on Amazon /
similar.

---

## 6. First connection + authorize

1. Plug the cable into the phone
2. Plug the other end into the laptop
3. On the phone, drag down the notification shade — you should see
   **"USB charging this device"** or similar. Tap it. Choose
   **File transfer / Android Auto** (NOT "Charging only").
4. A dialog should pop up on the phone: **"Allow USB debugging?"**
   with a long fingerprint string and a checkbox **"Always allow from
   this computer"**.
5. **Check the checkbox**, then tap **Allow**.

If the dialog doesn't appear:

- Wait 10 seconds, replug the cable
- Try `adb devices` from PowerShell (next section) — sometimes running
  the command is what triggers the dialog
- If still nothing → bad cable (section 5)

---

## 7. Verify it worked

In PowerShell:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices
```

Expected:

```
List of devices attached
2B201JEHN03654    device
```

The serial number will be different — that's your phone's serial. The
key word is **device**. If you see one of these instead:

| Output | Meaning | Fix |
|---|---|---|
| `unauthorized` | Phone showed dialog but you tapped Deny or it timed out | Replug cable → tap Allow on phone dialog |
| `offline` | Some state mismatch | Run `adb kill-server` then `adb devices` again |
| Empty list | Phone not seen at all | Bad cable (section 5), or driver missing (Windows) |

### Windows-specific: driver issues

If `adb devices` is empty AND the cable is good, install Google's
universal USB driver:

1. <https://developer.android.com/studio/run/win-usb>
2. Download → unzip
3. Right-click `android_winusb.inf` → Install

After install, replug. The driver makes Windows recognize the phone's
ADB interface.

---

## 8. Add ADB to your PATH

Typing the full path every time is annoying. Add the folder to PATH:

**Windows (PowerShell, run as your user):**

```powershell
[Environment]::SetEnvironmentVariable(
  "Path",
  [Environment]::GetEnvironmentVariable("Path","User") + ";$env:LOCALAPPDATA\Android\Sdk\platform-tools",
  "User")
```

Close **every** open PowerShell window, then open a fresh one. Type:

```
adb version
```

Should print the version without the full path. PATH is now persistent
across reboots.

**macOS / Linux** (zsh/bash):

```bash
echo 'export PATH="$HOME/Library/Android/sdk/platform-tools:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

Adjust the path if you installed Android Studio elsewhere.

---

## 9. The Brooks helper script

The Brooks repo ships a PowerShell wrapper at `web\scripts\adb-debug.ps1`.
It auto-detects ADB even if PATH isn't set, knows the Brooks package id
(`uk.brooksweb.app`), and provides one-word commands for the things you
actually do dozens of times during debugging.

### 9.1 One-time: allow unsigned scripts

PowerShell blocks unsigned local scripts by default. Allow them for
your user only (run once):

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

This is the standard policy for personal dev machines. Internet-
downloaded scripts still require explicit unblocking.

### 9.2 Try it

From `C:\Users\YourName\Path\To\Brooks_prequel\web`:

```powershell
.\scripts\adb-debug.ps1
```

You'll see a list of every command the script supports. The ones you'll
use most:

| Command | What it does |
|---|---|
| `devices` | List connected phones |
| `inspect` | Open chrome://inspect (the main debug window) |
| `logs` | Tail logcat filtered to just the Brooks app process |
| `console` | Tail Capacitor + Chromium WebView console only |
| `info` | Show the installed version + SDK levels |
| `stop` | Force-stop the Brooks app |
| `clear` | Wipe Brooks app data (keep app installed) |
| `uninstall` | Remove the app completely |
| `install <apk>` | Install a freshly built APK |
| `screenshot` | Save the phone's current screen to `screen.png` |
| `record [sec]` | Record a screen video to `repro.mp4` (default 30s) |
| `wireless` | Set up cable-free debugging |

If you ever forget what a command does, run `.\scripts\adb-debug.ps1`
again with no arguments — full help prints.

---

## 10. Chrome DevTools attached to the WebView

**This is the win for a Capacitor app. It gives you the same DevTools
experience as inspecting a website on your laptop — Console, Network,
Sources, Performance, breakpoints — but pointed at the live app on your
phone.**

### 10.1 Steps

1. Make sure the phone is plugged in and ADB sees it
   (`.\scripts\adb-debug.ps1 devices`)
2. **Open the Brooks app on the phone.** Just launch it normally. You
   need it to be FOREGROUND for the WebView to appear in the inspect
   list. If it's backgrounded or closed, nothing will show.
3. On the laptop, open Chrome (or any Chromium browser — Edge works too)
   and go to:

   ```
   chrome://inspect/#devices
   ```

4. Wait 3-5 seconds. Under **Remote Target #YourPhone**, you should see:

   ```
   WebView in uk.brooksweb.app
   https://brooksweb.uk/whatever-page-you're-on
   [inspect] [pause]
   ```

5. Click **inspect**.

A DevTools window opens. **It's pointed at the live WebView on your
phone**. Anything that happens in the app — console.log, network
requests, errors — shows here in real time.

### 10.2 What to do once DevTools is open

**Console tab** — shows everything `console.log`, `console.warn`,
`console.error` printed. This is where the app's diagnostic output
lives. Brooks specifically logs:
- `[Brooks] root render error: …` — when the error boundary catches a crash
- `[memory] save POST failed: …` — when a memory save fails
- `[PermissionsBootstrap] location: …` — when the location dialog fails
- `[tour] …` — tour navigation events

**Network tab** — every HTTP request the app makes. Click any request
to see headers, payload, response, timing. Filter by typing in the
search box (e.g. type `memor` to see only memory-related requests).

**Sources tab** — the JS code running in the app. With source maps
(Brooks ships them in dev builds), you can set breakpoints in your
TypeScript files and step through. Hit `Cmd+P` / `Ctrl+P` to fuzzy
find a file (e.g. type `MapsExperience` to open that file).

**Performance tab** — record a session and see what the main thread
is doing. Use this when something feels slow ("tour froze for 2 seconds
when I clicked Next"). Click the record dot, do the slow action on the
phone, click stop — you get a millisecond-by-millisecond breakdown.

**Application tab** → **Local Storage** → `https://brooksweb.uk`. Useful
keys to check:
- `brooks.onboarding.completed` — is the tour marked done?
- `brooks.permissionsBootstrap.v2` — has the install-time permission
  prompt fired yet?

### 10.3 Common gotcha: "WebView in uk.brooksweb.app" doesn't appear

- App is in the background → bring it foreground on the phone
- USB connection dropped → re-plug the cable
- ADB session needs a kick → `adb kill-server` then refresh chrome://inspect
- Phone screen locked → unlock it; some phones gate ADB while locked

### 10.4 Shortcut

The Brooks helper has a one-word command for this:

```powershell
.\scripts\adb-debug.ps1 inspect
```

It opens `chrome://inspect/#devices` for you with hints printed to the
PowerShell window.

---

## 11. ADB logcat (for native crashes)

Chrome DevTools doesn't show native Android crashes (the kind that
make the app close immediately on first launch). For those, you need
`logcat`, which is Android's system log.

### 11.1 Tail just Brooks

```powershell
.\scripts\adb-debug.ps1 logs
```

This filters logcat to **only** the Brooks app's process. Stays running
— Ctrl+C to stop.

What to look for:
- `AndroidRuntime: FATAL EXCEPTION` → unhandled native exception, the
  next ~20 lines show the stack trace
- `ANR in uk.brooksweb.app` → app hung, see `traces.txt` for what the
  main thread was doing
- Errors with `[Capacitor]` prefix → plugin issues (e.g. Geolocation
  plugin not registered = "Capacitor: Geolocation plugin not implemented
  on android")

### 11.2 Tail just JS / WebView console

```powershell
.\scripts\adb-debug.ps1 console
```

Same as Chrome DevTools Console tab but in the terminal. Useful when
you can't open DevTools for some reason.

### 11.3 Save a full log buffer

To capture everything in the buffer right now (last few thousand lines)
to a file you can read offline:

```powershell
.\scripts\adb-debug.ps1 save-logs
```

Saves to `brooks-log.txt` in your current folder.

### 11.4 Reproducing a specific bug

When you want to capture a fresh log for a specific reproducible bug:

```powershell
# 1. Start a clean log capture
.\scripts\adb-debug.ps1 logs > bug-log.txt

# 2. On the phone, do the thing that triggers the bug
# 3. Back at the laptop, Ctrl+C to stop the capture
# 4. Open bug-log.txt — search for "FATAL", "ERROR", or "Exception"
```

---

## 12. Wireless debugging (no cable)

Once USB debugging is authorized once via cable, you can run cable-free.
Convenient when you don't want to be tethered to your laptop.

### 12.1 Preparation (phone still plugged in)

```powershell
.\scripts\adb-debug.ps1 wireless prepare
```

This:
- Switches ADB to TCP/IP mode on port 5555
- Prints the phone's Wi-Fi IP address

### 12.2 Unplug and connect

Note the IP from step 12.1, then:

```powershell
.\scripts\adb-debug.ps1 wireless 192.168.1.42
```

(Use your actual IP.) After this, `adb devices` should show the phone
as `192.168.1.42:5555 device`. Everything else (Chrome inspect, logs,
etc.) works the same as USB.

### 12.3 Faster pairing on Android 11+

Settings → Developer options → **Wireless debugging** → **Pair device
with QR code**. Open Chrome on the phone, scan the QR. No cable
required for the initial pairing.

### 12.4 Caveat

Wireless ADB only works on the same Wi-Fi network as the laptop. If
your phone roams to a different network or the laptop goes to sleep,
the connection drops — reconnect with `adb connect <ip>:5555`.

---

## 13. Common commands cheatsheet

Brooks-specific (use the helper):

| Command | Effect |
|---|---|
| `.\scripts\adb-debug.ps1 devices` | List connected devices |
| `.\scripts\adb-debug.ps1 inspect` | Open chrome://inspect |
| `.\scripts\adb-debug.ps1 logs` | Tail Brooks process logs |
| `.\scripts\adb-debug.ps1 console` | Tail JS console only |
| `.\scripts\adb-debug.ps1 info` | Show installed versionCode + SDK |
| `.\scripts\adb-debug.ps1 stop` | Force-stop the app |
| `.\scripts\adb-debug.ps1 clear` | Wipe app data, keep install |
| `.\scripts\adb-debug.ps1 uninstall` | Remove the app |
| `.\scripts\adb-debug.ps1 install path\to\app.apk` | Install an APK |
| `.\scripts\adb-debug.ps1 screenshot` | Save screen.png |
| `.\scripts\adb-debug.ps1 record 30` | Record 30s video to repro.mp4 |

Raw ADB (works regardless of helper):

| Command | Effect |
|---|---|
| `adb devices` | List connected devices |
| `adb kill-server` | Reset the ADB connection (cures most weirdness) |
| `adb reboot` | Reboot the phone |
| `adb shell pm list packages \| findstr brook` | All installed Brooks packages |
| `adb shell dumpsys package uk.brooksweb.app` | Detailed info on installed app |
| `adb shell pm clear com.google.android.apps.nexuslauncher` | Reset Pixel launcher (fixes icon cache) |
| `adb shell input keyevent KEYCODE_HOME` | Press the home button from the laptop |
| `adb shell screencap -p \| & "${env:LOCALAPPDATA}\Android\Sdk\platform-tools\adb.exe" exec-out > screen.png` | Screenshot (manual) |

---

## 14. Troubleshooting

### "adb command not found"

You haven't added platform-tools to PATH ([section 8](#8-add-adb-to-your-path)),
OR you didn't close + reopen PowerShell after setting PATH.

### Phone listed as `unauthorized`

The "Allow USB debugging?" dialog timed out or was denied. Unplug,
replug, watch for the dialog, check "Always allow", tap Allow.

### Phone not listed at all

In order of likelihood:
1. **Charge-only cable** — try a different one
2. **USB mode wrong** — pull down notification shade on phone, change
   USB mode to "File transfer"
3. **Driver missing** (Windows) — install Google USB driver from
   <https://developer.android.com/studio/run/win-usb>
4. **ADB server stuck** — `adb kill-server` then `adb devices`
5. **Phone gated by lock screen** — unlock the phone

### Chrome inspect shows no WebView

- App isn't running → open it
- App is backgrounded → bring it foreground
- WebView is showing the offline fallback (not loaded brooksweb.uk) →
  navigate to a page first, then refresh chrome://inspect
- `adb kill-server` then refresh chrome://inspect

### `chrome://inspect/#devices` shows the phone but no targets

The WebView debugging flag isn't set in the AAB. Check that
`WebView.setWebContentsDebuggingEnabled(true)` is called somewhere
in `MainActivity.java`. For Brooks, Capacitor enables this by default
for debug builds. **Release builds may have it disabled**; if your AAB
was built via `gradlew bundleRelease` (not debug), DevTools may not
attach. Build a debug APK with `gradlew assembleDebug` to confirm —
debug build's APK is at `web\android\app\build\outputs\apk\debug\app-debug.apk`.

### `chrome://inspect` shows "Pending authentication"

Switch back to the phone — there's a USB debugging dialog waiting for
you to tap Allow.

### "the system cannot find the path specified" when running scripts

You're not in the `web/` folder. Cd into it first:

```powershell
cd C:\Users\YourName\Path\To\Brooks_prequel\web
.\scripts\adb-debug.ps1 devices
```

### Logs show `Capacitor: Geolocation plugin not implemented on android`

The `@capacitor/geolocation` plugin needs `npx cap sync android` after
installing it via `npm install`. From `web/`:

```powershell
npm install
npx cap sync android
cd android
gradlew bundleRelease
```

Then rebuild and reinstall the AAB.

### App icon shows default / placeholder despite rebuilding

Pixel launcher caches icons aggressively, even across uninstall. Fix:

```
adb shell pm clear com.google.android.apps.nexuslauncher
adb reboot
```

The phone restarts; on home screen the Brooks icon should now be the
brand mark.

### `ERR_HTTP_RESPONSE_CODE_FAILURE` when app loads

WebView's HTTP/2 or QUIC state corrupted. Try:
1. Open mobile Chrome on the same phone → load `https://brooksweb.uk`
   — does it work? If not, network problem (try mobile data).
2. If mobile Chrome works but Brooks app fails → force-stop the app
   (`.\scripts\adb-debug.ps1 stop`) and reopen.
3. If still broken → `.\scripts\adb-debug.ps1 clear` wipes app data
   and forces a fresh load.

---

## 15. Debugging the actual Brooks issues

Brooks's biggest active debugging targets, with the specific commands
that surface the relevant info.

### Tour freeze ("learning mode jammed")

```powershell
.\scripts\adb-debug.ps1 inspect
```

In DevTools:
- Console → filter by `tour` or `onboarding` → look for missing
  spotlight selectors or slow rAF poll messages
- Network → filter by `tour` → check how long
  `/api/tour/sample-creator` takes
- Performance → record while clicking Next on the slow step

### Memory save fails

```powershell
.\scripts\adb-debug.ps1 inspect
```

In DevTools Console — search for:
- `[memory] save POST failed:` followed by the error message
- `[memory] save blocked: missing auth token` → session expired
- `[memory] save blocked: missing geolocation` → location permission denied

### First-launch crash

DevTools won't attach to a crashed app, so use logcat:

```powershell
.\scripts\adb-debug.ps1 logs
```

Open the app. If it crashes, the logs will contain `FATAL EXCEPTION`
followed by a Java/Kotlin stack trace. The first few lines after FATAL
are the culprit.

If the app reaches React but errors out, the root error boundary
catches it and pushes to `window.__brooksErrors`. To see those after a
successful reload:

```powershell
.\scripts\adb-debug.ps1 inspect
```

DevTools Console → type:

```javascript
window.__brooksErrors
```

You'll see an array of all caught errors with timestamps and stack
traces.

### Location / notification permission prompts not appearing

```powershell
.\scripts\adb-debug.ps1 info
```

Verify `versionCode=7` or later (older builds don't have the proper
plugin-based bootstrap). If older → Play Console hasn't propagated;
wait 30 min and re-check.

Then DevTools Console → search for:
- `[PermissionsBootstrap] location:` → any error from the Geolocation plugin
- `[PermissionsBootstrap] notifications:` → any error from PushNotifications

If you see "plugin not implemented" → `npx cap sync android` wasn't
run after `npm install`. Rebuild.

### Icon doesn't show after install

The launcher cache is the most common cause:

```
adb shell pm clear com.google.android.apps.nexuslauncher
```

Wait 5 seconds, then check the home screen.

If still wrong, verify what's installed:

```powershell
.\scripts\adb-debug.ps1 info
```

Look for `versionCode`. If it's less than the latest you uploaded to
Play, Play Console hasn't propagated.

---

## Where to go next

- **Capacitor docs:** <https://capacitorjs.com/docs/android>
- **Chrome DevTools docs:** <https://developer.chrome.com/docs/devtools/remote-debugging>
- **ADB reference:** <https://developer.android.com/tools/adb>
- **Brooks build guide:** see `BUILD_ANDROID.md` in this repo

If you hit something this guide doesn't cover, capture a Chrome
DevTools screenshot + a snippet of `.\scripts\adb-debug.ps1 logs`
output and share both — between the two you can diagnose almost
anything Brooks-specific.
