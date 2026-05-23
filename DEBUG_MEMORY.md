# Find the Brooks Memory Problem — Dead-Simple Guide

**Goal:** the Brooks app uses too much memory on the phone and Android kills it.
This guide finds **exactly what is using the memory**, step by step. No prior
knowledge needed. Just follow the numbers in order and write down what you see.

> You do NOT need to understand the words "GPU" or "heap". Each step tells you
> what to click, what you'll see, and what to write down. At the end there is a
> simple table that turns your notes into the answer.

**Platform assumed:** Windows 11 laptop + Pixel phone, USB cable. Last updated 2026-05-23.

---

## What we already know (read once, 1 minute)

- When you open the **Maps** screen, the app slowly grows to about **6.4 GB** of
  memory and the phone kills it.
- That 6.4 GB lives in **two places**:
  - **The "app picture memory" (~3.8 GB)** — the part of the phone that draws the map.
  - **The "JavaScript memory" (~2.45 GB)** — the part that runs the website code + map tiles.
- We need to find out **which of these is the troublemaker, and why** (too many map
  pins? too many big photos? the map drawing itself?).

**There are 4 tools below.** Do them **in order**. Each one answers a different
question. You can stop as soon as the table at the bottom points clearly at the cause.

| Tool | Answers the question | Hard? |
|---|---|---|
| 1. Chrome DevTools | "What is downloaded, and how big is the memory?" | Easy |
| 2. adb meminfo | "Is the 3.8 GB the map drawing, or something else?" | Easy |
| 3. Backend log | "How many map pins are we sending from the server?" | Medium |
| 4. Charles proxy | "Show me EVERY piece of data, system-wide" | Harder |

---

# PART A — One-time setup (do this once)

### A1. Turn on "USB debugging" on the phone
1. Phone → **Settings** → **About phone**.
2. Tap **Build number** seven times (keep tapping). It says "You are now a developer".
3. Go back → **Settings** → **System** → **Developer options**.
4. Turn **USB debugging** **ON**.
5. (Nice to have) turn **Stay awake** ON so the screen doesn't sleep while plugged in.

### A2. Plug the phone into the laptop
- Use the cable that came with the phone (some cables only charge and won't work).
- On the phone, pull down the top notification → tap the USB notification → choose **File transfer**.
- If a popup says **"Allow USB debugging?"** → tap **Allow** (tick "Always allow").

### A3. Open PowerShell and set the `adb` shortcut
Open **PowerShell** (Start menu → type "PowerShell" → Enter). Paste these two lines:
```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb devices
```
✅ **What you should see:** a line like `58051JEBF08550   device`.
❌ If it says `unauthorized` → look at the phone and tap **Allow**.
❌ If the list is empty → try a different cable, or re-do step A2.

### A4. Make sure the **debug** app is installed (important!)
The Play Store version **cannot** be inspected. You need the **debug** version.
Paste these (one block):
```powershell
cd C:\Users\Boris\Dell\Projects\APPS\Brooks_prequel\web\android
.\gradlew assembleDebug
& $adb uninstall uk.brooksweb.app
& $adb install -r app\build\outputs\apk\debug\app-debug.apk
```
✅ **What you should see:** the last line says `Success`.
(You'll have to sign into Brooks again — that's normal.)

### A5. Open the app and get to the Maps screen
1. Tap the **Brooks** icon on the phone.
2. **Sign in.**
3. Tap **Maps**. Wait for the map to appear. **Leave it on this screen.**

You're now ready. Start with Tool 1.

---

# TOOL 1 — Chrome DevTools (the main tool)

This shows you, for the website running inside the app: every file it downloads
(and its size), and how much memory it is using — all in real time.

### 1.1 Open the inspector
1. On the **laptop**, open **Google Chrome** (install it if you don't have it).
2. In the address bar, type exactly: `chrome://inspect` → press **Enter**.
3. Make sure **Discover USB devices** is ticked.
4. Wait ~10 seconds. Under your phone's name you'll see **`Brooks`** (or `brooksweb.uk`).
5. Click the blue **`inspect`** link under it.
6. A new window opens — this is **DevTools**. Keep it open.

❌ If nothing appears: the app must be the **debug** build (Part A4) and **open on the
phone**. Re-check A4 and A5.

### 1.2 NETWORK tab — see every download and its size
1. In DevTools, click the **Network** tab at the top.
2. On the phone, pull the Maps screen down to refresh, **or** tap another tab and
   tap **Maps** again, so it reloads while Network is recording.
3. You'll see a list of rows filling up. Click the **"Size"** column header to sort
   biggest-first.

👉 **Write down (TOOL 1 notes):**
- **A-1:** The single biggest response size (look for rows like `influencers`, `map`, `memories`). e.g. "influencers = 850 KB".
- **A-2:** Roughly **how many image rows** there are (avatars/photos — type `img` in the **Filter** box, top-left, to show only images). e.g. "about 400 images".
- **A-3:** The **Transferred** total at the very bottom of the window. e.g. "Transferred 6.2 MB".

### 1.3 PERFORMANCE MONITOR — watch memory grow live
1. In DevTools, click the **⋮** (three dots, top-right) → **More tools** → **Performance monitor**.
2. You'll see live graphs. Watch these three:
   - **JS heap size** (the JavaScript memory)
   - **DOM Nodes** (how many things are on the page — each map pin is many nodes)
   - **GPU memory** (the map drawing memory) — if shown
3. On the phone, reload the Maps screen and **pan/zoom around for ~30 seconds**.

👉 **Write down:**
- **B-1:** The highest **DOM Nodes** number you see. (Over ~2000 is a red flag.)
- **B-2:** The highest **JS heap size**.
- **B-3:** Does **JS heap** keep climbing even when you stop touching the phone? (yes/no)

### 1.4 MEMORY tab — photograph what is stuck in memory
1. Click the **Memory** tab.
2. Choose **Heap snapshot** → click **Take snapshot**.
3. When it finishes, at the top set the dropdown to **Summary**, and click the
   **"Retained Size"** column to sort biggest-first.

👉 **Write down:**
- **C-1:** The top 3 row names and their Retained Size (e.g. "HTMLImageElement — 600 MB").

---

# TOOL 2 — adb meminfo (the drawing/GPU memory)

DevTools can't see the "app picture memory" (the 3.8 GB). This tool can.

### 2.1 Take a memory snapshot
With the app **on the Maps screen**, go back to **PowerShell** and paste:
```powershell
& $adb shell dumpsys meminfo uk.brooksweb.app
```
You'll get a table. Look at the section called **`App Summary`** near the bottom.

👉 **Write down (TOOL 2 notes):**
- **D-1:** `Graphics:` …… kB
- **D-2:** `GL mtrack:` …… kB   (these two = the map **drawing/GPU** memory)
- **D-3:** `Native Heap:` …… kB  (the map **tile drawing** memory)
- **D-4:** `Dalvik Heap:` …… kB  (the plain Java app memory — usually small)
- **D-5:** `TOTAL` …… kB  (everything)

### 2.2 (Optional) graphics detail
```powershell
& $adb shell dumpsys gfxinfo uk.brooksweb.app | Select-String "Total|GPU|memory"
```

> **Tip:** run 2.1 twice — once right when the map opens, and again after panning
> for a minute. If the numbers keep climbing, something is leaking.

---

# TOOL 3 — Backend payload log (server side)

This answers "how many map pins is the server sending?" — a top suspect. It needs a
**one-line code change** on the backend, then a redeploy. (Ask your developer / Claude
to add it — it's tiny.)

### 3.1 What to add (for the developer)
In the backend controller that serves the map (`/api/maps/influencers` and
`/api/memories/map`), add a log line that prints the **number of items** and the
**response size** before returning. Example (Java/Spring):
```java
log.info("MAP influencers returned {} pins (~{} KB)", pins.size(), approxKb);
```

### 3.2 How to read it
1. After it's deployed, open the Maps screen on the phone.
2. On the laptop, open the **GCP Logs** for the backend (Google Cloud Console →
   Logging → Logs Explorer), or your usual log viewer.
3. Search for `MAP influencers returned`.

👉 **Write down (TOOL 3 notes):**
- **E-1:** How many **pins** were returned? (e.g. "4,300 pins" = far too many.)
- **E-2:** How many **memories** were returned?

---

# TOOL 4 — Charles proxy (full network x-ray) — ADVANCED

This shows **every** piece of data between phone and internet, system-wide. It is the
fiddliest tool. **You usually don't need it** — Tool 1's Network tab already gives the
sizes. Use this only if you want the complete picture or DevTools missed something.

### 4.1 Install Charles
1. On the laptop, download **Charles Proxy** from <https://www.charlesproxy.com/download/> and install it.
2. Open Charles. It starts recording immediately.

### 4.2 Turn on HTTPS reading
1. Charles menu → **Proxy** → **SSL Proxying Settings** → **SSL Proxying** tab.
2. Click **Add** → Host: `*.brooksweb.uk` → Port: `443` → OK. Add another for `*` if you want everything.

### 4.3 Find the laptop's IP and port
1. In PowerShell: `ipconfig` → find **IPv4 Address** (looks like `192.168.1.23`). Write it down.
2. Charles → **Proxy** → **Proxy Settings** → note the **Port** (usually `8888`).

### 4.4 Point the phone at Charles
1. Phone → **Settings** → **Wi-Fi** → tap your network → **Modify / gear icon**.
2. Set **Proxy** to **Manual**.
3. **Hostname** = the laptop IP from 4.3 (e.g. `192.168.1.23`); **Port** = `8888`. Save.
4. On the laptop, Charles will pop up **"Allow"** for the phone — click **Allow**.

### 4.5 Install the Charles certificate on the phone (so HTTPS is readable)
1. On the **phone's browser**, go to: `chls.pro/ssl` → it downloads a certificate.
2. Phone → **Settings** → **Security** → **Encryption & credentials** → **Install a certificate** → **CA certificate** → pick the downloaded file.
3. ⚠️ **Important gotcha:** Android apps usually **ignore** user-installed certificates.
   For Charles to read the Brooks app's HTTPS, the **debug** build must be set to trust
   user certificates (a `network_security_config.xml` with `<certificates src="user"/>`
   in debug). If Charles shows the requests but the bodies say **"SSL handshake failed"
   / blank**, that's why — ask your developer to enable user-cert trust in the **debug**
   build only. (This is also why Tool 1 is easier.)

### 4.6 Read the sizes
- Open Maps on the phone. In Charles, find rows under `brooksweb.uk`. The **Size**
  column shows each response size; click a row → **Response** tab to inspect it.

👉 **Write down:** the biggest responses + how many image requests (same idea as Tool 1).

### 4.7 ⚠️ UNDO when finished
**Turn the phone's Wi-Fi proxy back to "None"** (Part 4.4, set Proxy = None) or the
phone won't reach the internet when Charles is closed.

---

# 🎯 NOW FIND THE EXACT ISSUE — the decision table

Take the numbers you wrote down and read across:

| What you saw | What it means | The fix |
|---|---|---|
| **B-1 DOM Nodes very high** (e.g. >2000) **AND A-2 many image rows** | Too many **map pins**, each with a **photo**, are on screen at once | Limit pins to the visible area; show fewer; use GL pins instead of HTML pins; load smaller avatars |
| **C-1 top object is `HTMLImageElement` / images huge** | **Avatar photos** are loaded at full size and pile up | Serve resized avatars (small thumbnails); reuse `next/image` sizing |
| **D-1/D-2 Graphics + GL mtrack are most of the total** | The **map drawing itself (GPU)** is the hog | Flatten the map (2D only, no 3D/tilt), simpler style, fewer layers; ultimately a native map |
| **D-3 Native Heap is the biggest** | **Map tiles** rasterizing is the hog | Lower tile detail / cache; simpler style |
| **E-1 pins in the thousands** | The **server sends too many pins** | Change the backend to only send pins for the visible map area |
| **B-3 JS heap keeps climbing while idle** | A **leak** in the website code | Find what keeps growing in the Memory snapshot (Tool 1.4) |
| **D-5 TOTAL stays low (<800 MB) and no crash** | It's fixed / not reproducing | Nothing to do |

**Rule of thumb:** if **Tool 2's Graphics + GL mtrack** add up to most of the memory →
it's the **map drawing** (hardest, may need a native map). If **Tool 1 shows thousands
of DOM nodes / huge image memory** → it's **too many pins/photos** (fixable in the
website code). If **Tool 3 shows thousands of pins** → it's the **server sending too
much** (fixable in the backend).

---

# 📋 What to send back (copy this and fill in)

```
TOOL 1 (DevTools):
  A-1 biggest response size:
  A-2 number of image requests:
  A-3 total transferred:
  B-1 peak DOM Nodes:
  B-2 peak JS heap:
  B-3 JS heap climbs while idle? (yes/no):
  C-1 top 3 retained objects:

TOOL 2 (meminfo):
  D-1 Graphics:
  D-2 GL mtrack:
  D-3 Native Heap:
  D-4 Dalvik Heap:
  D-5 TOTAL:

TOOL 3 (backend log), if done:
  E-1 pins returned:
  E-2 memories returned:
```

Send those numbers and the cause is pinned in one pass.
