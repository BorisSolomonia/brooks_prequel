'use client';

import { isNative } from '@/lib/capacitor';

// Capture a photo. In the native app uses @capacitor/camera (proper camera UX +
// permissions); on web returns null so callers fall back to a file <input
// capture="environment"> instead. Returns a File ready for api.uploadMedia.
export async function capturePhoto(): Promise<File | null> {
  if (!isNative()) return null;
  try {
    // @ts-ignore - resolved at runtime once @capacitor/camera is installed
    const mod = await import('@capacitor/camera');
    const { Camera, CameraResultType, CameraSource } = mod;
    const photo = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
    });
    const webPath = photo?.webPath;
    if (!webPath) return null;
    const res = await fetch(webPath);
    const blob = await res.blob();
    const ext = (photo.format || 'jpeg').replace('jpeg', 'jpg');
    return new File([blob], `capture-${Date.now()}.${ext}`, { type: blob.type || 'image/jpeg' });
  } catch {
    return null;
  }
}
