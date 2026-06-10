# Map Architecture Deep-Dive (BOR-39)

Evidence-based analysis of the four areas named in BOR-39, with the applied corrections.
Date: 2026-06-10.

## 1. Coordinate state loss between Guide Creation stages

**Verdict: already fixed in prior work; the real remaining loss was the /maps camera.**

The full create→edit coordinate chain was traced and is intact:

- Stage 1 pin capture: `GuideMetadataForm.tsx` `DestinationMap` → `onPatch({latitude, longitude})`
- POST body → `GuideService.createGuide` persists lat/lng (`guide.setLatitude/setLongitude`,
  with the comment "Persist the Stage 1 destination pin so it survives the round-trip")
- `toFullResponse` returns lat/lng → edit page fetch → `GuideEditor` re-hydrates
  (`latitude: initialGuide?.latitude ?? undefined`) → PATCH → `updateGuide` persists.

The loss that *did* still exist: the **/maps camera (center + zoom) reset to the env
fallback on every visit**. Layers and filters already persisted (localStorage + URL),
but pan/zoom work was discarded on any navigation away.

**Correction applied** (`MapsExperience.tsx`): camera persisted to `sessionStorage` on
every `moveend`; on init the saved camera takes precedence over the env fallback, and the
one-shot geolocation auto-centre is suppressed when a camera was restored. Deep links
(`?memory=<id>`) still win because their `setView` runs after init. `sessionStorage` was
chosen over URL params (no history pollution, no broken share links) and over a global
state store (nothing else needs this state — a store would be the intrusive option).

## 2. Viewport UI audit (bottom nav / sheets)

**Verdict: the layout was already mostly sound; one real clip found and fixed.**

- The map container reserves nav space explicitly: `h-[calc(100svh-9rem-env(safe-area-inset-bottom))]`.
  Bottom-anchored overlays (Create-a-memory CTA, pin/memory cards, Leaflet attribution)
  live *inside* that container, so they sit above the bottom nav — no overlap.
- Leaflet z-indexes are deliberately capped to 1–7 in `globals.css` (Android WebView
  stacking workaround); the nav (z-50) correctly paints above the map.
- Filters live in a right-side drawer, not a bottom sheet — no map/sheet conflict.
- Map pickers (`MapPickerModal`) are full-screen z-60 modals covering the nav entirely.

**Real defect found:** the selected pin/memory cards used
`max-h-[calc(100dvh-9rem)]` — *viewport*-relative — while anchored at `bottom-12` inside
an `overflow-hidden` container. On small screens a tall card could exceed the space above
its anchor and get its top edge clipped. **Fixed** by making the cap container-relative:
`max-h-[calc(100%-4rem)]`.

## 3. Geofencing & battery ("Memories" proximity alerts)

**Verdict: the ticket's premise is false — there is no background location tracking.
The foreground implementation is already deliberately tuned; no correction required.**

Facts (all verified in code):

- Proximity alerts come from `useProximityNotifier`: foreground-only, armed 3 s after the
  /maps map is ready, torn down on unmount. Native path uses `@capacitor/geolocation`
  `watchPosition`; web path polls `getCurrentPosition` every 20 s.
- Distance is a client-side haversine against viewport memories; alerts fire only on an
  outside→inside 100 m *transition*, deduped per-memory per-day via localStorage.
- `AndroidManifest` declares `ACCESS_FINE/COARSE_LOCATION` only — **no**
  `ACCESS_BACKGROUND_LOCATION`. The app cannot track in the background, by design
  ("phone-locked case: out-of-scope for v1" — hook header comment).
- Past battery/stability issues were already engineered out, each with a postmortem
  comment: 5 m GPS-jitter dedupe, 3 s arming delay (renderer memory pressure), async
  watch-leak guard, and an explicit decision NOT to gate the watcher on `memories.length`
  (viewport churn would restart the watcher and re-open the leak window).

Battery profile: continuous high-accuracy GPS **only while /maps is open** — comparable
to any maps app in active use; zero cost backgrounded/closed. For a 100 m trigger radius,
high accuracy is required (network-level accuracy is 100–500 m).

**v2 path (if product wants locked-phone alerts):** native OS geofencing via
`@capacitor-community/background-geolocation` (or per-platform GeofencingClient /
CLLocationManager region monitoring), `ACCESS_BACKGROUND_LOCATION` + Play Store
declaration, and server-side proximity evaluation pushing FCM — none of which exists
today. This is a feature ticket, not a correction.

## 4. SDK evaluation: stay or migrate

**Verdict: STAY on Leaflet 1.9.4 + Mapbox raster tiles. Migration to mapbox-gl is not
only unnecessary — it was already tried and actively harmful.**

| Criterion | Current (Leaflet + Mapbox raster) | mapbox-gl (WebGL) |
|---|---|---|
| Android WebView stability | Stable — plain `<img>` tiles the WebView GC handles | **Proven OOM**: WebView never frees evicted tile GL textures on pan → 4 GB → LMK kill (see `POSTMORTEM_MAPS_GPU_OOM` references in 5 files) |
| Custom styling | Full Mapbox Studio styles via raster endpoint; dark/light swap without map rebuild | Same styles, vector-crisp rendering |
| Marker scale | 80 creator + 100 memory HTML markers (hard-capped), `leaflet.markercluster`, Map-diffed add/remove — adequate at current pin volumes | Better at 1000s of markers (symbol layers) — a scale Brooks does not have |
| Clustering | `L.markerClusterGroup` (radius 50, off at zoom 10) — working | GeoJSON source clustering — equivalent capability |
| Bundle | ~43 KB gz (Leaflet + cluster), dynamically imported | ~230 KB gz, plus the WebView risk |
| Cost | Identical Mapbox account: raster tile requests + geocoding calls | Same billing; vector tiles ≈ same order |

Supporting facts:

- All six map surfaces (MapsExperience, ProfileLocationMap, creator About map,
  PlaceCard picker, GuideMetadataForm destination map, PurchasedTripMap) already share
  the Leaflet + raster pattern with consistent postmortem rationale comments.
- `mapbox-gl@3.21.0` was still in `package.json` but had **zero imports** — dead weight
  from the abandoned WebGL approach. **Removed in this change** (−28 npm packages).
- Geocoding is Mapbox-only on the client; the backend's `google_place_id` column is
  dormant (no Google Places API calls anywhere) — candidate for future cleanup.

**Revisit trigger:** only if pin volume grows ~10× beyond the current 80/100 caps or
vector-quality rendering becomes a product requirement — and then evaluate MapLibre GL
*native* (Capacitor plugin, out of the WebView) rather than mapbox-gl in the WebView,
because the WebView GPU constraint is the binding one.
