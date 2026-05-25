# Postmortem: The `/maps` Page Crash (GPU Out-Of-Memory)

**Date resolved:** 2026-05-25
**Severity:** App-killing — the Android app crashed every time a user opened `/maps`.
**Root cause (one line):** The Android WebView's GPU never threw away old map-tile textures, so
memory filled to ~4 GB and the operating system killed the app.
**Fix (one line):** Stopped using WebGL maps (mapbox-gl) on the page and switched to a plain
image-tile map (Leaflet + Mapbox **raster** tiles), which has no GPU texture pile to leak.

> Read this **before** touching the maps page or "optimizing" anything map-related. It exists so
> nobody burns another multi-day debugging session on the same wall.
> Companion doc: `DEBUG_MEMORY.md` (the *investigation method* — how we measured it). This doc is
> the *answer* (what it was + how it was fixed + how to never repeat it).

---

## 1. Explain it like I'm a kid 🧒

Imagine you're coloring a giant map on a magic whiteboard. Every time you slide the map to look
somewhere new, the whiteboard draws fresh colored pieces (these are called **tiles**). The old
pieces you slid away from are supposed to be **wiped off** so there's room for new ones.

There are two magic whiteboards in our story:

- **The Chrome whiteboard** (the normal phone browser): when a piece scrolls off, it politely
  **erases it**. The board stays tidy. It only ever holds about a fistful of pieces (~100 MB).
- **The WebView whiteboard** (the special board *inside our app*): it draws the new pieces but
  **forgets to erase the old ones**. So every time you slide the map, the pile of leftover colored
  pieces gets bigger… and bigger… and bigger. After enough sliding the pile is so huge
  (about **4 GB** — a giant mountain of leftover pieces) that the phone says *"You're using too
  much room, I'm shutting this app down!"* 💥 — and the app crashes.

**The clever part of figuring this out:** we put the *exact same map* on both whiteboards and
just kept sliding. The Chrome board stayed tidy (a small fistful, ~104 MB). The WebView board
grew to a mountain (~4 GB) and crashed. Same map, same sliding — only the **board** was
different. That proved the problem wasn't *our* map drawing; it was the **WebView whiteboard's
broken eraser**.

**How we fixed it:** we stopped using the fancy "live paint" board (WebGL/mapbox-gl) and switched
to a board that just **pins up pre-printed photo squares** of the map (raster image tiles via
Leaflet). Printed photos don't need the GPU's special paint pile at all — so there's nothing to
pile up, and nothing to leak. The map looks almost the same, but the mountain can never grow.

---

## 2. What actually happened (the grown-up version)

The Brooks app is a **Capacitor** app: a thin native Android shell wrapping a **WebView** (an
embedded browser) that loads the Next.js site. The `/maps` page used **mapbox-gl**, which renders
the map with **WebGL** — i.e. the GPU paints vector tiles into **GL textures**.

When you pan, mapbox-gl loads new tiles and evicts old ones from its JS cache. Evicting the JS
object is supposed to also free the underlying **GPU texture**. In desktop/mobile **Chrome** it
does. In the **Android System WebView's GPU/compositor layer it did not** — the evicted textures
were never released. So `GL mtrack` (the GPU-texture memory counter in `dumpsys meminfo`)
**ratcheted up on every pan** and never came back down, even after navigating away from `/maps`.

Measured progression on a Pixel 9a inside the WebView:
`GL mtrack` **5 MB → 1.1 GB → 2.4 GB → 3.2 GB → 4.0 GB → process killed by the Low-Memory-Killer.**

Meanwhile the **JS heap stayed ~40 MB** and **Dalvik ~9 MB** the whole time. That's the trap:
every JavaScript-side tool (DevTools heap snapshots, `performance.memory`) looked *innocent*,
because the leaking memory lived in a layer JavaScript cannot see or reach — the **host process's
GPU memory**.

### The decisive experiment (why we're certain)

| Same stock mapbox-gl map, panned ~30×… | `GL mtrack` result |
|---|---|
| …in the device's **Chrome** browser | **FLAT ~104 MB** ✅ (tidy eraser) |
| …in the Brooks **Capacitor WebView** | **5 MB → 4 GB → crash** ❌ (broken eraser) |

No Brooks code, no auth, no data, no markers — a *dataless* stock map crashed the WebView. That
single A/B proved the cause was **mapbox-gl-in-WebView (the engine + WebView GPU layer)**, not our
2,700-line page.

---

## 3. Two separate symptoms (don't confuse them)

This bug masqueraded as two things. They have different causes and different fixes:

1. **FREEZE** — the page locks up / UI thrashes.
   - Cause: a `100dvh` container fed a **resize → render → resize loop** (the dynamic viewport
     height recomputed, resized the map, which re-rendered, which recomputed the height…), plus a
     too-small `maxTileCacheSize: 4` causing constant tile thrash.
   - Fix: `dvh` → **`svh`** (static viewport height — can't recompute), and `maxTileCacheSize: 50`.

2. **OOM / crash** — the app gets killed by the OS.
   - Cause: the **WebView GPU-texture leak** described above (engine-level, unfixable from JS).
   - Fix: **remove WebGL from the page** (Leaflet + raster tiles).

If you only fix the freeze, the OOM still kills you. If you only fix the OOM, a sloppy container
height can still freeze you. Both fixes shipped.

---

## 4. The fix that shipped ✅

**Migrated `web/src/components/maps/MapsExperience.tsx` from mapbox-gl (WebGL) to Leaflet +
Mapbox raster tiles.**

- **Leaflet** renders the map with plain `<img>` tiles in the DOM — **no WebGL, no GL textures**.
  The browser's normal image cache handles eviction, so the GPU-texture pile that leaked simply
  **does not exist** anymore.
- Tiles come from the **Mapbox Raster Tiles API** (`api.mapbox.com/styles/v1/{style}/tiles/...`)
  via the `rasterTileUrl()` helper, so the look (dark-v11 / light-v11, live theme switching) is
  preserved.
- Clustering preserved via **leaflet.markercluster**; creator pins, memory pins, and the user
  location marker are Leaflet `divIcon` markers (reusing the exact DOM elements as before).
- Validated on-device: a controlled stock-Leaflet map stayed **bounded ~100 MB** under heavy
  panning — the mountain never grows.

> **Deploy note:** the migration is in the code and the release AAB (v18 / 1.1.8) loads
> `https://brooksweb.uk`. The Leaflet `/maps` must be **deployed to brooksweb.uk first**, or the
> shipped app still pulls the old mapbox-gl page and still crashes. Code fix ≠ deployed fix.

### Things we tried that did NOT work (don't repeat these)

Every one of these was an attempt to fix a **GPU-engine** problem from **JavaScript** — which is
impossible, because JS can't reach the native GL surface:

- ❌ `map.pixelRatio` API — **does not exist** in mapbox-gl v2 *or* v3.
- ❌ Shadowing `window.devicePixelRatio` — no effect on the native GL surface.
- ❌ `flyTo` → `jumpTo` — irrelevant to texture freeing.
- ❌ `maxTileCacheSize` tuning — controls the JS cache, not the leaked GPU textures.
- ❌ A CSS wrapper to downscale the canvas — **backfired**: it destabilized the container height
  and triggered the infinite resize→render loop (made it *worse*).
- ❌ Rewriting the React page from scratch in the same stack — JS heap was only ~40 MB; rewriting
  the cheap part cannot fix the expensive (GPU) part.
- ⚠️ `--force-gpu-mem-available-mb` WebView flag — *did* cap the climb (plateaued ~3.2 GB) but
  (a) still too high and (b) only settable via a debug-only `webview-command-line` file, not in
  production. Useful as a diagnostic, not a shippable fix.

The **only** structural fixes were: remove WebGL (Leaflet/raster — what we shipped) **or** move
the map to a native plugin outside the WebView. Everything else was a band-aid on the wrong layer.

---

## 5. How we measured it (the tools that told the truth)

- ★ **`adb shell dumpsys meminfo uk.brooksweb.app`** → App Summary. Watch **`GL mtrack`** (GPU
  textures) and **`Graphics`**. This is the one number that mattered and it **survives the crash**.
- DevTools heap snapshot / `performance.memory` → **lied / looked fine** (JS-only). In fact
  `performance.memory` reported a bogus *used > limit* (3.6 GB) in this WebView — **ignore it.**
- The A/B isolation (stock map in Chrome vs WebView) → the decisive proof of *where* the leak lives.

**WSL/USB gotchas worth remembering** (this dev runs WSL2; the phone's USB is owned by Windows):
- Use Windows `adb.exe`, not WSL adb. `adb forward`/`adb reverse` point at **Windows** localhost,
  not WSL's — a WSL `curl localhost:PORT` returning nothing does **not** mean the server is down.
- The client API base is baked at build time as `http://localhost:8080`, so an on-device test
  needs `adb reverse tcp:8080 tcp:8080` or every fetch is "failed to fetch."
- WebView remote debugging only exists in **debug** builds; release builds can't be inspected.

---

## 6. 🚱 Prevention rules — read before any map / WebView GPU work

1. **No WebGL maps inside the Capacitor WebView on Android.** mapbox-gl / MapLibre / any WebGL
   map will leak GPU textures here. Use **Leaflet + raster tiles** (shipped) or a **native map
   plugin**. This is the headline rule — everything else is detail.
2. **If you ever reintroduce a WebGL map, you own a regression.** Before merging, run the
   `dumpsys meminfo` pan test on a real device and prove `GL mtrack` **plateaus**, not ratchets.
3. **Never try to fix a GPU-memory problem from JavaScript.** JS heap ≠ GPU memory. If `GL mtrack`
   is the thing growing, no JS lever (cache size, pixel ratio, fly/jump) can fix it. Change the
   rendering engine instead.
4. **Believe `dumpsys meminfo GL mtrack`, distrust DevTools heap and `performance.memory`** for
   this class of bug. The leak is in the **host process GPU**, invisible to JS tools.
5. **Never use `dvh`/`dynamic viewport` units on a map container.** Use `svh`. Dynamic units
   recompute on viewport change and create resize→render→resize loops with map ResizeObservers.
6. **Never wrap the map in a transform/percentage-sized box to "downscale" it.** It destabilizes
   the measured height and triggers the same infinite resize loop. We tried; it backfired.
7. **Always reproduce on a real device, not just Chrome.** The whole bug only appears in the
   Android System WebView — Chrome hid it completely. "Works in Chrome" proves nothing here.
8. **Code fix ≠ shipped fix.** The Capacitor app loads `brooksweb.uk`. Deploy the web change to
   prod *first*, then ship the APK/AAB — otherwise the released app still loads the old broken page.
9. **A clean rewrite is not a fix for an engine-level bug.** Measure *which layer* owns the bytes
   before deciding to rebuild. Here the expensive layer (GPU) wasn't the layer a rewrite touches.

---

## 7. One-paragraph summary for future-me

`/maps` crashed because the Android System WebView's GPU compositor never freed mapbox-gl's
evicted tile textures on pan; `GL mtrack` ratcheted to ~4 GB and the OS killed the app. Proven by
an A/B: identical stock map flat ~104 MB in Chrome vs 4 GB→crash in the WebView. JS heap was only
~40 MB, so it was never a code/React problem and no JS lever could fix it. The fix was to remove
WebGL from the page — migrate to **Leaflet + Mapbox raster image tiles** (no GL textures to leak),
which stays bounded ~100 MB. Don't put WebGL maps in this WebView again; if you must, prove
`GL mtrack` plateaus on a real device before merging; and deploy the web fix before shipping the
app shell.
