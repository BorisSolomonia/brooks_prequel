// Client-side image downscale/recompress before upload (BOR-60).
//
// Camera originals are 2–8 MB at ~4000px and the backend stores uploads
// byte-for-byte, so without this every guide cover / place photo / avatar is
// served at full camera resolution. Hooked into api.uploadMedia — the single
// upload choke point — so every image path (upload field, camera capture,
// web-image picks, memory composer) is capped at the source.
//
// Encoding: WebP at ~0.82 quality, falling back to JPEG where the canvas
// can't encode WebP (Safari). Failures never block the upload — the original
// file is sent instead.

const DEFAULT_MAX_EDGE = 1920;
const AVATAR_MAX_EDGE = 512;
const DEFAULT_QUALITY = 0.82;
// Already within bounds and smaller than this → recompression isn't worth it.
const SKIP_BYTES = 300 * 1024;

export function maxEdgeForUsage(usage: string): number {
  return usage === 'PROFILE_AVATAR' ? AVATAR_MAX_EDGE : DEFAULT_MAX_EDGE;
}

type Decoded = { source: CanvasImageSource; width: number; height: number; cleanup: () => void };

async function decode(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === 'function') {
    try {
      // 'from-image' applies EXIF rotation so portrait phone photos keep
      // their orientation after the canvas round-trip.
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, cleanup: () => bitmap.close() };
    } catch {
      // Older WebViews reject the options bag — retry without it. Those
      // browsers apply EXIF orientation during decode anyway.
      const bitmap = await createImageBitmap(file);
      return { source: bitmap, width: bitmap.width, height: bitmap.height, cleanup: () => bitmap.close() };
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, cleanup: () => URL.revokeObjectURL(url) };
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function compressImageFile(
  file: File,
  maxEdge: number = DEFAULT_MAX_EDGE,
  quality: number = DEFAULT_QUALITY,
): Promise<File> {
  if (!file.type.startsWith('image/') || typeof document === 'undefined') return file;
  try {
    const decoded = await decode(file);
    const scale = Math.min(1, maxEdge / Math.max(decoded.width, decoded.height));
    if (scale === 1 && file.size <= SKIP_BYTES) {
      decoded.cleanup();
      return file;
    }

    const targetW = Math.max(1, Math.round(decoded.width * scale));
    const targetH = Math.max(1, Math.round(decoded.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      decoded.cleanup();
      return file;
    }
    // White underlay so PNG transparency doesn't turn black on the JPEG
    // fallback path (WebP would preserve it, JPEG can't).
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(decoded.source, 0, 0, targetW, targetH);
    decoded.cleanup();

    let blob = await toBlob(canvas, 'image/webp', quality);
    if (!blob || blob.type !== 'image/webp') {
      blob = await toBlob(canvas, 'image/jpeg', quality);
    }
    // No encoder, or recompression didn't actually shrink it → keep original.
    if (!blob || blob.size >= file.size) return file;

    const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
    const base = file.name.replace(/\.[^.]+$/, '') || 'image';
    return new File([blob], `${base}.${ext}`, { type: blob.type });
  } catch {
    return file;
  }
}
