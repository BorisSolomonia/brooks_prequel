#!/usr/bin/env node
// Generates web/resources/icon-foreground.png AND icon-background.png from
// icon-only.png. Run once whenever icon-only.png changes.
//
//   cd web
//   npm install --no-save pngjs   # one-time
//   node scripts/make-icon-foreground.mjs
//   npm run cap:assets
//   npx cap sync android
//
// Adaptive icon spec (Android 8+): cap:assets v3 wraps both layers in
// <inset android:inset="16.7%" /> in the generated XML. That inset is the
// safe-zone margin — so the source PNGs MUST be full-bleed (logo fills the
// canvas). If we pre-padded for the safe zone here, the logo would be
// double-inset and tiny.
//
// Output:
//   resources/icon-foreground.png — 1024×1024 PNG, transparent bg,
//       logo (pink circle + cream B + gold dot) filling the canvas
//   resources/icon-background.png — 1024×1024 PNG, solid #C95A7D
//       (Brooks rose; matches --iconBackgroundColor in the npm script)
//
// Pipeline:
//   1. Crop source to the tightest bounding box of non-cream pixels.
//   2. Apply an inscribed-circle alpha mask to drop the cream bbox corners.
//   3. Box-downsample the masked square to 1024×1024 with premultiplied
//      alpha math so the antialiased edge doesn't bleed cream.
//   4. Write directly (no safe-zone offset — cap:assets handles that).

import { PNG } from 'pngjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, '..', 'resources', 'icon-only.png');
const OUT_FG = resolve(__dirname, '..', 'resources', 'icon-foreground.png');
const OUT_BG = resolve(__dirname, '..', 'resources', 'icon-background.png');

const CANVAS = 1024;

// Brand colors.
const CREAM = { r: 247, g: 241, b: 231 };      // #F7F1E7 surround we want gone
const BG_COLOR = { r: 201, g: 90, b: 125 };    // #C95A7D Brooks rose
const TOLERANCE = 24;

const isCream = (r, g, b) =>
  Math.abs(r - CREAM.r) <= TOLERANCE &&
  Math.abs(g - CREAM.g) <= TOLERANCE &&
  Math.abs(b - CREAM.b) <= TOLERANCE;

// ────────────────────────────────────────────────────────────────────────────
// Foreground

console.log(`Reading ${SRC}…`);
const src = PNG.sync.read(readFileSync(SRC));
const { width: sw, height: sh } = src;

let minX = sw, minY = sh, maxX = -1, maxY = -1;
for (let y = 0; y < sh; y++) {
  for (let x = 0; x < sw; x++) {
    const i = (y * sw + x) * 4;
    if (!isCream(src.data[i], src.data[i + 1], src.data[i + 2])) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
}
if (maxX < 0) throw new Error('No non-cream pixels — adjust TOLERANCE.');

const cropW = maxX - minX + 1;
const cropH = maxY - minY + 1;
const side = Math.max(cropW, cropH);
const cx = minX + cropW / 2;
const cy = minY + cropH / 2;
const sqLeft = Math.max(0, Math.min(sw - side, Math.round(cx - side / 2)));
const sqTop = Math.max(0, Math.min(sh - side, Math.round(cy - side / 2)));
const sqSide = Math.min(side, sw - sqLeft, sh - sqTop);
console.log(`Logo bbox ${cropW}×${cropH} → square ${sqSide}×${sqSide} at (${sqLeft},${sqTop})`);

// Circular mask while extracting the square crop.
const cr = sqSide / 2;
const crSq = cr * cr;
const square = Buffer.alloc(sqSide * sqSide * 4);
for (let y = 0; y < sqSide; y++) {
  for (let x = 0; x < sqSide; x++) {
    const s = ((sqTop + y) * sw + (sqLeft + x)) * 4;
    const d = (y * sqSide + x) * 4;
    const dx = x - cr, dy = y - cr;
    square[d] = src.data[s];
    square[d + 1] = src.data[s + 1];
    square[d + 2] = src.data[s + 2];
    square[d + 3] = (dx * dx + dy * dy <= crSq) ? src.data[s + 3] : 0;
  }
}

// Premultiplied-alpha box downsample → 1024×1024.
const ratio = sqSide / CANVAS;
const fg = new PNG({ width: CANVAS, height: CANVAS });
fg.data.fill(0);
for (let y = 0; y < CANVAS; y++) {
  const y0 = Math.floor(y * ratio);
  const y1 = Math.min(sqSide, Math.floor((y + 1) * ratio));
  for (let x = 0; x < CANVAS; x++) {
    const x0 = Math.floor(x * ratio);
    const x1 = Math.min(sqSide, Math.floor((x + 1) * ratio));
    let rSum = 0, gSum = 0, bSum = 0, aSum = 0, n = 0;
    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) {
        const i = (yy * sqSide + xx) * 4;
        const a = square[i + 3];
        const aN = a / 255;
        rSum += square[i] * aN;
        gSum += square[i + 1] * aN;
        bSum += square[i + 2] * aN;
        aSum += a;
        n++;
      }
    }
    const d = (y * CANVAS + x) * 4;
    if (aSum > 0 && n > 0) {
      const aAvg = aSum / n;
      const aAvgN = aAvg / 255;
      fg.data[d] = Math.round((rSum / n) / aAvgN);
      fg.data[d + 1] = Math.round((gSum / n) / aAvgN);
      fg.data[d + 2] = Math.round((bSum / n) / aAvgN);
      fg.data[d + 3] = Math.round(aAvg);
    }
  }
}
writeFileSync(OUT_FG, PNG.sync.write(fg));
console.log(`✓ Wrote ${OUT_FG} (${CANVAS}×${CANVAS}, full-bleed)`);

// ────────────────────────────────────────────────────────────────────────────
// Background — solid #C95A7D

const bg = new PNG({ width: CANVAS, height: CANVAS });
for (let i = 0; i < bg.data.length; i += 4) {
  bg.data[i] = BG_COLOR.r;
  bg.data[i + 1] = BG_COLOR.g;
  bg.data[i + 2] = BG_COLOR.b;
  bg.data[i + 3] = 255;
}
writeFileSync(OUT_BG, PNG.sync.write(bg));
console.log(`✓ Wrote ${OUT_BG} (${CANVAS}×${CANVAS}, solid #C95A7D)`);
