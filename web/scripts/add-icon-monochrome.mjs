#!/usr/bin/env node
// Generates the Android 13+ themed-icon monochrome layer and wires it into
// the adaptive-icon XMLs.
//
// Run AFTER `npm run cap:assets` because cap:assets v3 rewrites the
// adaptive-icon XMLs and does not understand <monochrome>.
//
//   cd web
//   npm install --no-save pngjs   # one-time
//   npm run cap:assets
//   node scripts/add-icon-monochrome.mjs
//   cd android && gradlew bundleRelease
//
// Why this script exists:
// Android 13+ Pixel launchers (and Samsung One UI 5+, many third-party
// launchers) support "themed icons". When the user enables that mode and
// an app does NOT provide a <monochrome> drawable, the launcher tries to
// auto-derive a silhouette from the foreground PNG. The auto-derivation
// is unreliable and often produces a garbled white circle with random
// letter shapes (the "two blue T's" symptom the user saw on their Pixel).
//
// What this script does:
//   1. Reads resources/icon-foreground.png (the full-bleed foreground).
//   2. Extracts the cream "B" + gold dot pixels into a white-on-transparent
//      silhouette — Android themes will tint this with the user's color.
//   3. Resamples the silhouette to each Android mipmap density and writes
//      ic_launcher_monochrome.png into every mipmap-*dpi/ directory.
//   4. Adds <monochrome android:drawable="@mipmap/ic_launcher_monochrome"/>
//      to mipmap-anydpi-v26/ic_launcher.xml and ic_launcher_round.xml.
//
// Idempotent: safe to run twice.

import { PNG } from 'pngjs';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = resolve(__dirname, '..');
const SRC = join(WEB_ROOT, 'resources', 'icon-foreground.png');
const RES = join(WEB_ROOT, 'android', 'app', 'src', 'main', 'res');

// Standard Android launcher icon sizes per density (px) for the full
// adaptive-icon canvas (which is what cap:assets writes to mipmap-*dpi/).
const DENSITIES = {
  'mipmap-mdpi': 108,
  'mipmap-hdpi': 162,
  'mipmap-xhdpi': 216,
  'mipmap-xxhdpi': 324,
  'mipmap-xxxhdpi': 432,
};

// Cream + gold ranges — the brand-mark pixels we keep in the silhouette.
const CREAM = { r: 247, g: 241, b: 231 };
const GOLD = { r: 187, g: 152, b: 78 };
const TOL = 36;
const near = (r, g, b, c) =>
  Math.abs(r - c.r) <= TOL && Math.abs(g - c.g) <= TOL && Math.abs(b - c.b) <= TOL;

console.log(`Reading ${SRC}…`);
const src = PNG.sync.read(readFileSync(SRC));
const { width: W, height: H } = src;
console.log(`Source ${W}×${H}`);

// Step 1: build a white-on-transparent mask of the cream B + gold dot.
const mask = new PNG({ width: W, height: H });
mask.data.fill(0);
let kept = 0;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const a = src.data[i + 3];
    if (a === 0) continue;
    const r = src.data[i], g = src.data[i + 1], b = src.data[i + 2];
    if (near(r, g, b, CREAM) || near(r, g, b, GOLD)) {
      mask.data[i] = 255;
      mask.data[i + 1] = 255;
      mask.data[i + 2] = 255;
      mask.data[i + 3] = a;
      kept++;
    }
  }
}
console.log(`Silhouette kept ${kept.toLocaleString()} pixels`);

// Step 2: box-downsample the mask to each density and write to disk.
function downsample(srcPng, targetSize) {
  const ratio = srcPng.width / targetSize;
  const out = new PNG({ width: targetSize, height: targetSize });
  out.data.fill(0);
  for (let y = 0; y < targetSize; y++) {
    const y0 = Math.floor(y * ratio);
    const y1 = Math.min(srcPng.height, Math.floor((y + 1) * ratio));
    for (let x = 0; x < targetSize; x++) {
      const x0 = Math.floor(x * ratio);
      const x1 = Math.min(srcPng.width, Math.floor((x + 1) * ratio));
      let aSum = 0, n = 0;
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const i = (yy * srcPng.width + xx) * 4;
          aSum += srcPng.data[i + 3];
          n++;
        }
      }
      const d = (y * targetSize + x) * 4;
      const a = n > 0 ? Math.round(aSum / n) : 0;
      out.data[d] = 255;
      out.data[d + 1] = 255;
      out.data[d + 2] = 255;
      out.data[d + 3] = a;
    }
  }
  return out;
}

for (const [dir, size] of Object.entries(DENSITIES)) {
  const targetDir = join(RES, dir);
  if (!existsSync(targetDir)) {
    console.warn(`Skipping ${dir} — directory does not exist`);
    continue;
  }
  const small = downsample(mask, size);
  const outPath = join(targetDir, 'ic_launcher_monochrome.png');
  writeFileSync(outPath, PNG.sync.write(small));
  console.log(`✓ ${dir}/ic_launcher_monochrome.png (${size}×${size})`);
}

// Step 3: add <monochrome> to the adaptive-icon XMLs (idempotent).
const xmls = [
  join(RES, 'mipmap-anydpi-v26', 'ic_launcher.xml'),
  join(RES, 'mipmap-anydpi-v26', 'ic_launcher_round.xml'),
];

for (const xml of xmls) {
  if (!existsSync(xml)) {
    console.warn(`Skipping ${xml} — does not exist`);
    continue;
  }
  let body = readFileSync(xml, 'utf8');
  if (body.includes('<monochrome')) {
    console.log(`= ${xml} already has <monochrome>`);
    continue;
  }
  const monochrome = '    <monochrome android:drawable="@mipmap/ic_launcher_monochrome" />\n';
  body = body.replace(
    '</adaptive-icon>',
    `${monochrome}</adaptive-icon>`,
  );
  writeFileSync(xml, body);
  console.log(`✓ Added <monochrome> to ${xml}`);
}

console.log('\nDone. Now rebuild: cd android && gradlew bundleRelease');
