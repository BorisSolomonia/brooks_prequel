'use client';

import { isNative } from '@/lib/capacitor';

// Outcome of a native camera capture. Lets callers tell a real permission
// DENIAL (show guidance) apart from a user CANCEL (silent) and the web case
// where there is no native camera (fall back to a file <input capture>).
export type CaptureResult =
  | { status: 'captured'; file: File }
  | { status: 'cancelled' }
  | { status: 'denied' }
  | { status: 'unavailable' };

async function uriToFile(webPath: string, format: string | undefined): Promise<File> {
  const res = await fetch(webPath);
  const blob = await res.blob();
  const ext = (format || 'jpeg').replace('jpeg', 'jpg');
  return new File([blob], `capture-${Date.now()}.${ext}`, { type: blob.type || 'image/jpeg' });
}

// Capture a photo with the native camera (@capacitor/camera), reporting a
// detailed outcome. quality:80 compresses the image before upload (BOR-40).
// Requests Camera permission at runtime and surfaces an explicit `denied` so
// the caller can show a "enable Camera in Settings" message. The native camera
// provides its own capture → retake/use review UI.
export async function capturePhotoDetailed(): Promise<CaptureResult> {
  if (!isNative()) return { status: 'unavailable' };
  let mod: any;
  try {
    // @ts-ignore - resolved at runtime by the native shell
    mod = await import('@capacitor/camera');
  } catch {
    return { status: 'unavailable' };
  }
  const { Camera, CameraResultType, CameraSource } = mod;

  // Runtime permission: prompt if needed, bail early with `denied` so the UI can
  // explain instead of silently doing nothing.
  try {
    let perm = await Camera.checkPermissions();
    if (perm.camera === 'prompt' || perm.camera === 'prompt-with-rationale') {
      perm = await Camera.requestPermissions({ permissions: ['camera'] });
    }
    if (perm.camera === 'denied') return { status: 'denied' };
  } catch {
    // Older plugin / platform without checkPermissions — fall through and let
    // getPhoto trigger the OS prompt; denial is detected from its error below.
  }

  try {
    const photo = await Camera.getPhoto({
      quality: 80, // compress before upload (BOR-40)
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
    });
    if (!photo?.webPath) return { status: 'cancelled' };
    return { status: 'captured', file: await uriToFile(photo.webPath, photo.format) };
  } catch (err) {
    const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
    if (msg.includes('denied') || msg.includes('permission')) return { status: 'denied' };
    // "User cancelled photos app" and friends → treat as a silent cancel.
    return { status: 'cancelled' };
  }
}

// Backwards-compatible helper: a File on success, null otherwise. Existing
// callers (e.g. the guide-editor PlaceCard) keep their gallery-input fallback.
export async function capturePhoto(): Promise<File | null> {
  const result = await capturePhotoDetailed();
  return result.status === 'captured' ? result.file : null;
}
