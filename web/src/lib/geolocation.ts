'use client';

import { isNative } from '@/lib/capacitor';

export interface Coords {
  latitude: number;
  longitude: number;
  /** GPS horizontal accuracy in metres, when the platform reports it. Used by
   *  BOR-86 "Right Now" to reject vague fixes that can't prove presence. */
  accuracy?: number;
}

// One-shot current position. Uses the native @capacitor/geolocation plugin in
// the app (navigator.geolocation is sandboxed/unreliable in the Capacitor
// WebView) and the browser API on web. Resolves null instead of throwing so
// callers can fall back to manual entry without try/catch noise.
export async function getCurrentCoords(): Promise<Coords | null> {
  if (typeof window === 'undefined') return null;

  if (isNative()) {
    try {
      // @ts-ignore - resolved at runtime via npm install
      const mod = await import('@capacitor/geolocation');
      const pos = await mod.Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 8000,
      });
      if (
        pos?.coords &&
        typeof pos.coords.latitude === 'number' &&
        typeof pos.coords.longitude === 'number'
      ) {
        return {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: typeof pos.coords.accuracy === 'number' ? pos.coords.accuracy : undefined,
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  return new Promise<Coords | null>((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: typeof coords.accuracy === 'number' ? coords.accuracy : undefined,
      }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  });
}

/** The device's IANA timezone (e.g. "Asia/Tbilisi"), or null if unavailable. */
export function deviceTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}
