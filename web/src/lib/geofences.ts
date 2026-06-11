'use client';

// BOR-44 (Phase A): plugin-agnostic geofence sync.
//
// Fetches the geofences the device should monitor (memories shared WITH the
// viewer) and hands them to `registerNativeGeofences`. Phase A intentionally
// NO-OPS the native registration — the OS geofencing plugin (iOS CoreLocation
// region monitoring / Android GeofencingClient) is added in Phase B, which
// requires a native build + background-location permission. Until then this
// safely does nothing on web and on native (logs in dev only), so it can ship
// now without an APK rebuild.
//
// Phase B will: register the nearest <=20 regions, and on a native ENTER
// transition post a local notification "You are near a memory shared by
// [sharerName]!" carrying memoryId, deep-linking to /maps?memory=<id>.

import { api } from '@/lib/api';
import { isNative } from '@/lib/capacitor';
import { Geofence } from '@/lib/geofence-plugin';
import type { MemoryGeofence } from '@/types';

export async function fetchMyGeofences(token: string): Promise<MemoryGeofence[]> {
  return api.get<MemoryGeofence[]>('/api/me/memories/geofences', token);
}

// iOS monitors at most 20 regions; Android ~100. Register only the nearest ones.
export const MAX_MONITORED_REGIONS = 20;

/**
 * Register the regions with the native Geofence plugin. The native side posts
 * the notification itself on entry (works when the app is killed). Fully
 * guarded: on web, or before the native plugin is installed, it no-ops so this
 * is safe to ship ahead of the native build (Phase B).
 */
export async function registerNativeGeofences(geofences: MemoryGeofence[]): Promise<MemoryGeofence[]> {
  const toRegister = geofences.slice(0, MAX_MONITORED_REGIONS);
  if (!isNative()) {
    return toRegister; // web: nothing to monitor
  }
  try {
    await Geofence.setGeofences({
      regions: toRegister.map((g) => ({
        identifier: g.memoryId,
        latitude: g.latitude,
        longitude: g.longitude,
        radius: g.radiusMeters,
        notificationTitle: 'Brooks',
        notificationBody: `You are near a memory shared by ${g.sharerName}!`,
      })),
    });
  } catch {
    // Native plugin not installed yet (Phase B pending) — safe no-op.
  }
  return toRegister;
}

/** Fetch + (eventually) register the viewer's shared-memory geofences. */
export async function syncMemoryGeofences(token: string): Promise<MemoryGeofence[]> {
  const geofences = await fetchMyGeofences(token);
  return registerNativeGeofences(geofences);
}
