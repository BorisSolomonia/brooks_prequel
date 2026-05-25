# Debugging the Brooks `/maps` GPU-Memory OOM — Research-Grade Playbook

**Last updated 2026-05-25.** The app's WebView is killed by the Android Low-Memory-Killer
because `/maps` drives memory up. This playbook is the rigorous method to localize and kill it.

## ✅ CONFIRMED ROOT CAUSE (2026-05-25, FINAL — supersedes earlier sections)

Isolated by enabling WebView debugging (debug APK), connecting CDP, and reading the **detailed
`dumpsys` graphics breakdown** on a Pixel 9a. The runaway is **`GL mtrack` (GPU textures)** —
host process: `GL mtrack 3.73 GB`, EGL 90 MB, Java Heap 420 K, Native 140 K. NOT JS heap
(`performance.memory` reported a bogus 3.6 GB — used>limit, ignore it), NOT DOM (171 nodes),
NOT markers/data (pins failed to fetch; map was dataless), NOT a render loop (CDP `raf/sec = 0`).

**Decisive isolation — stock mapbox-gl 3.21 (NO Brooks code/React/auth/data), panned:**
- **In Chrome on the device:** `GL mtrack` FLAT ~104 MB. ✅
- **In the Brooks Android System WebView (Capacitor):** `GL mtrack` 5 MB → 1.1 → 2.4 → 3.2 →
  4.0 GB → **process killed.** ❌

⇒ **The Android System WebView's GPU layer does not free mapbox-gl's evicted tile GL textures
on pan** (Chrome does). This is a **WebView/Chromium-GPU issue, NOT Brooks code** — a dataless
stock map crashes it. Every JS fix failed because the code was never the cause.

**Mitigations tested (via `/data/local/tmp/webview-command-line`, debug WebView):**
- `--force-gpu-mem-available-mb=384 --enable-low-end-device-mode` → `GL mtrack` **plateaus
  ~3.2 GB and survives** (vs unbounded→crash). Helps but still too high.
- `--force-device-scale-factor=1` (shrink tile textures ~7× at this DPR) → **UNTESTED** (device
  USB-disconnected mid-test — likely from the repeated 4 GB OOM cycles). This is the next lever:
  the JS `devicePixelRatio` shadow never affected the native GL surface, but this WebView flag
  forces the actual render scale.

**Fix options (in order):** (1) force a low render scale + GPU-mem cap at the WebView level
(needs the flags set *programmatically* for production — Capacitor WebView init / a native shim,
since `/data/local/tmp/webview-command-line` is debug-only); (2) reduce tile churn (cap maxzoom,
keep `maxTileCacheSize: 50`); (3) **native map plugin** = the only structural fix that removes
WebView-GL entirely. JS-level changes cannot fix this — confirmed by the stock-map repro.

## 📟 ON-DEVICE USB PROFILING (2026-05-25) — engine exonerated; cause is our code

Live USB session on a **Pixel 9a** (WSL → Windows `adb.exe`; drove the map with
`adb shell input swipe`, sampled `dumpsys meminfo` GL mtrack per batch, read `logcat`).

**LIVE LOGGED-IN /maps — crash REPRODUCED + root cause confirmed:**
- On the real `/maps`, process `Graphics` = **2.5 GB baseline → 2.77 GB → 3.81 GB after 2 pan
  batches → process KILLED** (LMK). The OOM is real and reproducible.
- **A FRESH app launch is only ~88 MB Graphics.** So the 2.5 GB is **accumulated across
  navigation**, not a single `/maps` load — i.e. **un-disposed WebGL contexts piling up** as the
  user moves between map-bearing screens (Creator-profile map, trip map, repeated `/maps` mounts).
  This is the OOM root cause; the fix is disposing every map's GL context on unmount.
- **✅ FIX PROVEN on-device (controlled mount/unmount experiment, production-grade stock mapbox in
  Chrome — no StrictMode, no auth):** cycling map create/destroy ~16× —
  `dispose=0` (no `map.remove()`) **ratcheted GPU Graphics to ~505 MB and climbing**;
  `dispose=1` (`map.remove()` each cycle, == our fix) **stayed FLAT at 66 MB**. Disposing the
  WebGL context on unmount keeps memory bounded regardless of navigation count. This also makes
  the dev-vs-prod/StrictMode question moot: double-mounting is harmless **when each mount is
  disposed**, which our Creator-map cleanup + PurchasedTrip no-rebuild + /maps disposal now do.
- **Marker cost ruled out:** memory pins are pure-CSS `<button>` glyphs (no images); creator-pin
  avatars are 48×48 + lazy/async + capped at 80. Markers are cheap — not the GB driver.
- **DEV-BUILD CONFOUND:** the installed APK points at `http://localhost:3000` (capacitor.config),
  i.e. the `next dev` build, which runs **React StrictMode → double-mounts every component**,
  creating *two* map/WebGL contexts per mount and roughly doubling the leak. The dev numbers are
  worst-case; a production build (`next start` / brooksweb.uk) will be lower. Test prod to get a
  representative number. **PENDING:** final prod-build on-device measurement to confirm the fixes
  keep memory bounded across navigation (gated on a prod server running on `:3000`).
- Deployed `/maps` bundle (chunk `08f32a4…`) was verified to contain `100svh`,
  `maxTileCacheSize:50`, no `failIfMajorPerformanceCaveat`, no `workerCount` throttle.
- adb-host gotcha: `adb reverse tcp:3000` forwards device→**Windows** localhost:3000 (adb.exe is
  a Windows process), NOT WSL's localhost — so a WSL `curl localhost:3000` returning 000 does NOT
  mean the server is down. The dev server must run on the Windows side (or via WSL2 localhost relay).

**Decisive control — stock mapbox-gl 3.21 (dark-v11, `maxTileCacheSize:50`, NO Brooks
code/markers/auth) in the device's Chrome, panned 30×:**
- **GPU-process `GL mtrack` held FLAT ~104 MB** (104 → oscillated 100–113 → 104). No ratchet.
  Renderer PSS settled ~180 MB; browser graphics constant 64 MB.
- **mapbox-in-WebView does NOT leak GPU on this device.** The multi-GB runaway was **our code**,
  not the engine — the "go native" theory is empirically dead. `maxTileCacheSize:50` confirmed
  correct (stable under heavy panning).

**Two distinct symptoms, now separated:**
1. **FREEZE** = render-thread lockup — the `dvh` resize→render loop + the tiny
   `maxTileCacheSize:4` tile thrash. Fixed: `svh` + cache `50`.
2. **OOM / LMK (GL mtrack → GB)** = GPU-texture accumulation — **leaked WebGL contexts**
   (missing `map.remove()` on the Creator map; PurchasedTripMap rebuilding its context on every
   `items` change) + **hundreds of simultaneous DOM markers**. Fixed: unmount cleanup + drop
   `items` from init deps + viewport-scoped & capped markers.

**Device context:** phone had only **~520 MB free of 7.75 GB** (Instagram et al. resident);
`lowmemorykiller` was reaping *other* apps ("low watermark breached"). A loaded device kills
aggressively regardless — the app must stay lean (it now does).

**Method note:** `am start <url>` won't navigate Chrome if it's already foreground ("intent
delivered to top-most instance") — `force-stop` first; and poll `dumpsys` until GL mtrack > 0
before sampling (textures take seconds to allocate).

## 🔥 LEADING ROOT CAUSE (2026-05-24) — a `dvh` resize→render loop (NOT a fundamental WebView leak)

DevTools logs (desktop + persisting after the canvas-wrapper revert) showed `[mapbox] resize
fired!` **repeating with the container height shrinking 602→592→…→203 px**, plus an endless
`requestAnimationFrame→triggerRepaint→_render` chain. That is an **infinite resize→render loop** —
and it is the most plausible *engine* of the GPU runaway: every resize re-renders + re-rasterizes
tiles → GPU textures accumulate without bound.

Root: the `/maps` root container height was `calc(100dvh - …)`. **`dvh` (dynamic viewport height)
recomputes whenever the viewport changes** (mobile URL bar showing/hiding; on desktop, a docked
DevTools console that the per-frame `console.warn` spam kept growing). Each recompute resized the
map → mapbox re-rendered → reflowed → recomputed `dvh` → loop.

**Fix shipped:** `dvh` → **`svh`** (static small-viewport height — can't recompute, can't feed
back) on the map root container, and removed the per-frame debug `console.warn` resize handler.
**Status: pending on-device confirmation** — redeploy, then verify the resize loop is gone AND
`GL mtrack` plateaus instead of ratcheting. If confirmed, this resolves it with **no native
rewrite** — the earlier "WebView GL is unfixable / go native" conclusion was premature.

## What we have ALREADY proven (don't re-litigate these)
- It's **GPU memory**: `adb dumpsys meminfo` shows `GL mtrack` / `Graphics` climbing 19 MB →
  1.1 → 2.4 → 3.3 GB, **ratchets up on every pan, never freed even after leaving /maps**.
- **JS heap is ~40 MB the entire time** → React/page code is NOT the cost. A from-scratch
  React rewrite will NOT fix it.
- Leak persists with **stock** `dark/light-v11` styles.
- **Every JS lever failed**: `pixelRatio` (absent in mapbox-gl v2 AND v3), a
  `window.devicePixelRatio` shadow (no effect on the native GL surface), `flyTo→jumpTo`,
  `maxTileCacheSize`.
- **CSS-wrapper downscale BACKFIRED (confirmed 2026-05-24, REVERTED).** Wrapping the map
  container in a `relative/overflow-hidden` div with a transform/percentage-sized inner
  container destabilized the layout height → mapbox's ResizeObserver fired in an **infinite
  resize→render→resize loop** (console showed `[mapbox] resize fired!` with the height
  shrinking 642→260 px on every frame + an endless `requestAnimationFrame→triggerRepaint→
  _render` chain). This *increased* GPU/CPU use ("more severe"). **Lesson: do NOT manipulate
  the map container's box (transform/percentage size/wrapper) — mapbox + ResizeObserver loops.**
  Reverted to the plain `<div className="h-full w-full">`.

Conclusion so far: the memory is owned by **mapbox-gl + the Android System WebView's GL
compositor**, a layer JavaScript cannot reach. This playbook either proves a remaining
in-WebView lever works, or proves native is required — with evidence, not guesses.

---

## Mental model — where memory lives in a Capacitor WebView app
| Process | Holds | Seen in |
|---|---|---|
| **Host** `uk.brooksweb.app` | WebView **browser + GPU process**: GL textures (`GL mtrack`), EGL surfaces, dma-buf, Skia | `dumpsys meminfo` Graphics; `dmabuf_dump` |
| **Renderer** `…SandboxedProcess…` | V8 **JS heap**, `cc` raster tiles, command buffer | DevTools Memory; renderer meminfo |
| **Java/Dalvik** | Capacitor shell, plugins | meminfo Dalvik (~9 MB — irrelevant here) |
The leak is in the **host process GPU memory**. Tools that only see JS (DevTools heap) will
look innocent — that's the trap.

---

# STEP 1 — CAPTURE (get numbers that survive the crash)

1. **`adb shell dumpsys meminfo <pkg>` poll loop.** App Summary: Graphics / GL mtrack / EGL / Native / Dalvik / TOTAL. *Stress:* coarse (no sub-GPU breakdown), but survives the crash and needs nothing installed. ★ baseline.
2. **`adb shell dumpsys gfxinfo <pkg>`.** HWUI + "Total GPU memory usage". *Stress:* HWUI-centric, under-reports Chromium's own GL; cross-check only.
3. **`adb shell dmabuf_dump [pid]`** (Android 11+). Per-process dma-buf graphics buffers. *Stress:* shows buffer *handles* not GL textures; great for surface/buffer leaks, partial for texture growth.
4. **`/proc/<pid>/smaps` (or `showmap -t <pid>`).** Group by mapping: `/dev/kgsl-3d0`, `mali`, anon GL. *Stress:* verbose, device-GPU-specific names; powerful once you know the driver node.
5. **`/proc/<pid>/status` VmRSS poll.** Cheapest growth signal. *Stress:* no attribution, just "is it growing."
6. **Perfetto system trace** (`record_android_trace` / ui.perfetto.dev) with **gpu.memory + gfx + mem** data sources. *Stress:* best *timeline* of GPU/dmabuf vs actions; setup overhead; large traces.
7. **Chrome `chrome://tracing` / `about:tracing` with `memory-infra`.** ★★ The attribution gold standard — component breakdown (gpu, command_buffer, cc, skia, malloc, v8). *Stress:* requires the renderer alive at dump time (it dies on OOM — dump *before* the surge).
8. **DevTools (`chrome://inspect`) → Performance monitor.** Live JS heap / DOM nodes / GPU memory. *Stress:* connection dies with the renderer crash; read live, don't rely on saved recordings.
9. **DevTools → Memory → heap snapshot.** *Stress:* JS only — will look fine (that's the point: it rules JS out).
10. **Android Studio Memory Profiler** (attach to the debug build). Native + Graphics categories, allocation tracking. *Stress:* heavy, Java-biased, but the best GUI for native growth.

🥇 **Step-1 golden:** run the **`dumpsys meminfo` poll** (proves *where* + survives the crash) **and** a **`chrome://tracing` memory-infra dump captured at ~1.1 GB, before the surge** (proves *which GPU component*).

---

# STEP 2 — ATTRIBUTE (which subsystem owns the bytes)

1. **meminfo category split** — Graphics ≫ Native ≫ Dalvik already tells us "GPU." ★ done.
2. **memory-infra component dump** — `gpu/gl/textures` vs `cc/tile_memory` vs `skia` vs `command_buffer`. ★★ pinpoints the exact owner. *Stress:* component names shift across Chromium versions.
3. **`dmabuf_dump`** — are graphics *buffers* (surfaces) leaking vs *textures*? *Stress:* distinguishes surface leak from texture leak.
4. **Host-vs-renderer meminfo** — confirm the GB's are in the **host** (browser/GPU), not the renderer. *Stress:* must grab both PIDs quickly.
5. **DevTools heap snapshot** — confirm JS heap flat (~40 MB). *Stress:* rules out a JS/marker-object leak.
6. **DevTools → Rendering → "Layer borders" / `chrome://flags` composited-layer-borders** — count composited layers (DOM-marker explosion shows here). *Stress:* visual, qualitative.
7. **DOM node count** (Performance monitor) — thousands = marker/label DOM blow-up. *Stress:* indirect for GPU.
8. **`dumpsys SurfaceFlinger`** — surface/buffer count for the app. *Stress:* system-surface noise.
9. **`chrome://gpu`** — GPU process status, raster mode (GPU vs SW), driver. *Stress:* config, not live usage.
10. **smaps diff** (capture at low vs high) — which mapping grew by ~2 GB → the GL driver node. *Stress:* the most definitive native attribution, most tedious.

🥇 **Step-2 golden:** **memory-infra dump** → it will name `gpu` / `command_buffer` / `cc tiles` as the owner; cross-check with a **smaps low-vs-high diff** to see the GL driver mapping grow.

---

# STEP 3 — ISOLATE (what triggers the growth — controlled bisection)

Each is an A/B: change one thing, re-run the Step-1 poll.
1. **Blank style** (`{version:8,sources:{},layers:[]}`) — does the *empty* map still grow? *Stress:* isolates base engine from style content. ★
2. **No data** — don't fetch pins/memories. Markers ruled in/out.
3. **No markers, tiles only** — separates DOM markers from tile textures.
4. **Disable theme `setStyle`** — is the restyle orphaning textures?
5. **maxTileCacheSize 0 vs 50** — is retained-tile cache the holder?
6. **Static vs panning** — confirm it's per-interaction tile loading (it is).
7. **★★ Stock mapbox-gl example in the SAME debug WebView (zero Brooks code)** — load the official "display a map" example. If *it* leaks → mapbox-in-WebView is the cause, full stop. *Stress:* the single most decisive test in this whole doc.
8. **Brooks `/maps` in desktop Chrome** — leaks there too? separates "WebView" from "Chromium-general."
9. **Standalone Chrome app on the device** (open brooksweb.uk/maps in Chrome, not the WebView) — WebView-specific vs device-GPU-general.
10. **Different device / newer Android System WebView** — is it a WebView-version bug? *Stress:* needs a 2nd device; rules out a single bad WebView build.
11. **Raster style vs vector** — does raster (1 texture/tile) leak? isolates vector machinery (glyphs/symbols/extrusion).
12. **Force software rendering** (WebView flag `--disable-gpu-rasterization` / `--disable-gpu`) — if the leak vanishes, it's GPU-raster-specific.

🥇 **Step-3 golden:** **#7 — the stock mapbox example in the debug WebView.** It definitively answers "is this our 2,720-line page, or is it mapbox-gl-in-WebView itself?" Given all prior evidence, expect: it leaks → **the engine is the cause, no app rewrite can fix it.**

---

# STEP 4 — FIX & VERIFY (levers, stressed by likelihood)

1. **★ Native map plugin** (`@capacitor/google-maps` or native Mapbox SDK). GPU managed natively, outside the WebView. *Stress:* the only **100%** structural fix; large rewrite (reuse all non-map code).
2. **Cap the WebView GPU budget** via Chromium flag **`--force-gpu-mem-available-mb=<N>`** (and/or `--gpu-program-cache-size-kb`) so the compositor **evicts** instead of growing unbounded. Set via a `webview-command-line` file (debuggable) or `WebView` startup flags. *Stress:* HIGH-VALUE in-WebView lever worth testing **before** committing to native — but must verify Android System WebView honors it; may just trade memory for re-render jank.
3. **Raster tiles** (raster style). Far simpler GPU footprint, evicts cleanly. *Stress:* less crisp, no smooth rotate; medium effort.
4. **Periodic `map.remove()` + rebuild** on memory-pressure / interval. *Stress:* band-aid; visible reload flashes; doesn't stop in-burst growth.
5. **Real container downscale** (smaller CSS px **without** a scale transform — e.g. fewer device px via layout, not `transform`). *Stress:* low confidence (JS can't reach the native GL surface; the transform variant already failed/backfired).
6. **Strip style layers / fonts / 3D** (custom lean style). *Stress:* reduces magnitude, not the unbounded behavior.
7. **Remove theme `setStyle`** (one fixed style). *Stress:* removes one orphaning source; live theme-switch lost; partial.
8. **Static-map fallback on Android** (Mapbox Static Images API + HTML overlay). *Stress:* zero WebGL = zero leak, but loses pan/zoom on mobile.
9. **Upgrade Android System WebView / try a Mapbox version matrix.** *Stress:* may be a fixed upstream bug; cheap to test, uncertain.
10. **Reduce the rendered viewport** (smaller map element). *Stress:* fewer tiles, but UX cost; marginal.

🥇 **Step-4 golden:** test **#2 (GPU-budget flag)** as the one remaining cheap in-WebView shot; if it doesn't bound the climb, ship **#1 (native map)** — guaranteed.

---

# 🥇🥇 THE GOLDEN PATH (the sequence that resolves this with certainty)

1. **Attribute it once, precisely** — `chrome://tracing` **memory-infra** dump captured at ~1.1 GB (before the surge) → confirm the owner is `gpu`/`command_buffer`/`cc` (GPU textures), not JS. *(We already know it's GPU from meminfo; this nails the exact component.)*
2. **Run the decisive isolation (Step-3 #7)** — load a **stock mapbox-gl "empty map" example in the debug WebView**, no Brooks code, and run the meminfo poll while panning. **This is the fork:**
   - If the stock example **also** ratchets GL mtrack → the leak is **mapbox-gl-in-WebView itself**. No app-side code change (rewrite, downscale, cache) can fix it. → go to 3.
   - If it **doesn't** → the trigger is in our code; bisect Step-3 #1–#6 to find it.
3. **One in-WebView attempt:** set **`--force-gpu-mem-available-mb=512`** for the WebView and re-measure. If GL mtrack now **plateaus** (evicts under budget) → that's your no-rewrite fix; tune N. If it still OOMs or just janks → 4.
4. **Ship the native map (Step-4 #1).** This is the **100%** fix: the map renders on a native SurfaceView/GL context with native lifecycle, so the WebView-GL accumulation is structurally impossible. Keep every non-map module (`api.ts`, types, `useProximityNotifier`, filters, search) and swap only the map surface on Android.

**Why this is "100%":** steps 1–2 give *proof* of the cause (not opinion); step 3 is the single cheap lever that could avoid a rewrite; step 4 removes the leaking subsystem entirely. You either fix it in-WebView with evidence, or you move the map off the leaking engine — there is no third outcome where it stays broken.

---

## Quick command reference
```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
# Step 1 — survives the crash:
1..20 | % { & $adb shell dumpsys meminfo uk.brooksweb.app 2>$null | Select-String "TOTAL PSS|Graphics|GL mtrack|EGL mtrack|Native Heap"; Start-Sleep 1 }
# dma-buf graphics buffers (Android 11+):
& $adb shell dmabuf_dump $(& $adb shell pidof uk.brooksweb.app)
# smaps low-vs-high diff (capture twice, compare):
& $adb shell "cat /proc/$(& $adb shell pidof uk.brooksweb.app)/smaps" > smaps_high.txt
# Attribution: desktop Chrome → chrome://inspect → inspect → ⋮ → More tools → Performance monitor / Memory
# memory-infra: chrome://tracing → Record → category 'memory-infra' → take dump at ~1.1 GB
# WebView GPU-budget flag (debuggable WebView):
& $adb shell "echo '_ --force-gpu-mem-available-mb=512' > /data/local/tmp/webview-command-line"
```

> Note: the stock-mapbox-in-WebView test (golden step 2) needs a tiny test page served to the
> WebView — easiest is a one-file HTML with the mapbox-gl CDN script and an empty style, loaded
> by pointing `capacitor.config.ts` `server.url` at it (or a `webDir` test asset) on a throwaway
> debug build.
