'use client';

// BOR-44 (Phase B): TypeScript bridge to the custom native "Geofence" plugin.
//
// The native side (Android GeofenceBroadcastReceiver / iOS CLLocationManager)
// posts the proximity notification ITSELF, in native code — that's what makes
// it work even when the app is killed (no JS running). This bridge is only used
// while the app is alive, to (re)register the set of regions to monitor.
//
// registerPlugin returns a proxy; calling a method on web (or before the native
// plugin is installed) rejects — callers guard with isNative() + try/catch, so
// this file is safe to ship even before the native code exists.

import { registerPlugin } from '@capacitor/core';

export interface GeofenceRegion {
  identifier: string;   // memoryId
  latitude: number;
  longitude: number;
  radius: number;       // metres
  // Notification copy the NATIVE side shows on entry (built per-region so the
  // sharer's name is correct even when triggered from a killed app).
  notificationTitle: string;
  notificationBody: string;
}

export interface GeofencePlugin {
  /** Replace ALL currently-monitored regions with this set (≤20 on iOS). */
  setGeofences(options: { regions: GeofenceRegion[] }): Promise<void>;
  /** Remove every monitored region (e.g. on logout). */
  clearGeofences(): Promise<void>;
  /** Request location + background-location permission. Returns granted state. */
  requestPermissions(): Promise<{ location: string; background: string }>;
  checkPermissions(): Promise<{ location: string; background: string }>;
}

export const Geofence = registerPlugin<GeofencePlugin>('Geofence');
