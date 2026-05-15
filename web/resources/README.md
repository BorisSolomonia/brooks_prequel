# `web/resources/` — Brand source assets for `cap:assets`

`npm run cap:assets` reads source PNGs from this folder and generates every iOS + Android icon and splash density. **You must drop the three files below into this folder before running `cap:assets`.** I (the AI) cannot generate these — they are your brand identity.

## Required files

| Filename | Size | Format | Purpose |
|---|---|---|---|
| `icon.png` | **1024 × 1024 px** | PNG, no transparency, full-bleed | App icon source. The brand mark fills (or nearly fills) the frame — Android adds its own rounded mask, do **not** pre-round corners. |
| `icon-foreground.png` | **1024 × 1024 px** | PNG, **transparent** background | Adaptive-icon foreground layer (Android 8+). Brand mark only, no background colour — Android renders it on top of the colour set in `package.json` `cap:assets` (`#C95A7D` light / `#0E0E0E` dark). |
| `splash.png` | **2732 × 2732 px** | PNG | Splash screen source for light mode. Centre the logo at no more than 40 % of the frame; the rest is solid `#F7F1E7`. Capacitor crops this for every device aspect. |
| `splash-dark.png` | **2732 × 2732 px** | PNG | Splash for dark mode. Same logo, solid `#0E0E0E` background. |

## Generation rules `cap:assets` will apply

- Background colours come from the `npm run cap:assets` script in `web/package.json`:
  - Icon light: `#C95A7D` (Brooks rose)
  - Icon dark: `#0E0E0E`
  - Splash light: `#F7F1E7` (parchment)
  - Splash dark: `#0E0E0E`
- All Android icon densities (mdpi → xxxhdpi) and round/adaptive variants are produced automatically.
- All Play Store listing assets (the 512 × 512 icon, the 1024 × 500 feature graphic) are NOT generated — those are separate; see `STORE_LISTING.md`.

## When you're ready

```bash
cd web
npm run cap:assets
npx cap sync android
```

If you do not yet have artwork, the build will still succeed using the default green Capacitor placeholder — Play Console will reject that placeholder at submission time. So get this done before producing the AAB you intend to upload.
