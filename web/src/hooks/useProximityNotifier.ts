'use client';

import { useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/Toast';
import { isNative } from '@/lib/capacitor';
import type { MemoryMapPin } from '@/types';

// Foreground proximity notifier for memories shared WITH the viewer.
// Fires an in-app banner (via toast) when the user crosses from
// "outside 100 m" into "inside 100 m" of a memory. Dedupes per-memory
// per-calendar-day via localStorage.
//
// Mitigations baked in (from the deviations/biases analysis):
//   • Push-storm on first load: the FIRST distance reading for any
//     memory is recorded silently — we only fire on a transition
//     (was outside → is now inside).
//   • Dedupe: localStorage Set keyed by "brooks.proximityFired.YYYY-MM-DD"
//     so the same memory never re-fires the same calendar day.
//   • Radius: 100 m default. Easy to tune by changing one constant.
//   • Phone-locked case: by design out-of-scope for v1 (Approach A).
//     v2 layers @capacitor-community/background-geolocation on top
//     without touching the algorithm in this hook.
//
// Battery: polls every 20 s via navigator.geolocation.watchPosition
// (or @capacitor/geolocation when isNative()). Only runs while the
// component using this hook is mounted — unmount stops the watcher.

const PROXIMITY_RADIUS_METERS = 100;
const POLL_INTERVAL_MS = 20_000;

type OnFireMessage = {
  title: string;
  body: string;
  memory: MemoryMapPin;
};

type ProximityNotifierOptions = {
  enabled: boolean;
  memories: MemoryMapPin[];
  onFire?: (msg: OnFireMessage) => void;
};

export function useProximityNotifier({ enabled, memories, onFire }: ProximityNotifierOptions) {
  const toast = useToast();
  // Per-memory last-known distance. undefined = never measured.
  const lastDistRef = useRef<Map<string, number>>(new Map());
  // Today's fired memory ids — rehydrated from localStorage on mount.
  const firedTodayRef = useRef<Set<string>>(new Set());
  // Latest memories reference so the watcher callback always sees fresh data.
  const memoriesRef = useRef(memories);
  useEffect(() => {
    memoriesRef.current = memories;
  }, [memories]);

  // Restore today's fired set from localStorage (per-day key).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = `brooks.proximityFired.${todayKey()}`;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const arr = JSON.parse(raw) as string[];
        firedTodayRef.current = new Set(arr);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;

    let cancelled = false;
    let pollId: number | null = null;
    let cleanupNative: (() => void) | null = null;

    const handlePosition = (lat: number, lng: number) => {
      if (cancelled) return;
      // Filter to memories that were directly shared with the viewer.
      // Owned memories don't fire (you know where you put them).
      const candidates = memoriesRef.current.filter(
        (m) => m.sharedWithViewer && !m.ownedByViewer,
      );
      for (const m of candidates) {
        const newDist = haversineMeters(lat, lng, m.latitude, m.longitude);
        const lastDist = lastDistRef.current.get(m.id);
        lastDistRef.current.set(m.id, newDist);
        // Skip the first reading — set the baseline only.
        if (lastDist === undefined) continue;
        // Transition: was outside, now inside.
        const wasOutside = lastDist > PROXIMITY_RADIUS_METERS;
        const isInside = newDist <= PROXIMITY_RADIUS_METERS;
        if (wasOutside && isInside && !firedTodayRef.current.has(m.id)) {
          fire(m);
        }
      }
    };

    const fire = (m: MemoryMapPin) => {
      const who = m.creatorDisplayName
        ? m.creatorDisplayName
        : m.creatorUsername
          ? '@' + m.creatorUsername
          : 'Someone';
      const title = `${who} left a memory nearby`;
      const body = m.textPreview?.slice(0, 80) || 'Tap to open Brooks.';
      // In-app banner via toast (Material snackbar). Survives 6s.
      toast.info(`${title} — ${body}`, 6000);
      onFire?.({ title, body, memory: m });
      // Mark fired today + persist.
      firedTodayRef.current.add(m.id);
      try {
        const key = `brooks.proximityFired.${todayKey()}`;
        window.localStorage.setItem(key, JSON.stringify(Array.from(firedTodayRef.current)));
      } catch {
        /* ignore */
      }
    };

    // Native (Capacitor) — uses @capacitor/geolocation watchPosition for
    // proper OS-integrated location updates that work even when the
    // browser navigator.geolocation flake-y.
    const startNative = async () => {
      try {
        // @ts-ignore - resolved at runtime via npm install
        const mod = await import('@capacitor/geolocation');
        if (cancelled) return;
        const watchId = await mod.Geolocation.watchPosition(
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
          (pos: { coords?: { latitude: number; longitude: number } } | null) => {
            if (pos?.coords) handlePosition(pos.coords.latitude, pos.coords.longitude);
          },
        );
        // watchPosition is an async bridge call. If the effect was torn down
        // while it was in flight, the cleanup below already ran and found
        // `cleanupNative` still null — so it could NOT clear THIS watch.
        // Clear it here and bail; otherwise the native watch leaks. Leaked
        // GPS watchers accumulating across enabled-toggles/unmounts was the
        // unbounded RSS growth that drove the Android LMK kill.
        if (cancelled) {
          mod.Geolocation.clearWatch({ id: watchId }).catch(() => undefined);
          return;
        }
        cleanupNative = () => {
          mod.Geolocation.clearWatch({ id: watchId }).catch(() => undefined);
        };
      } catch (err) {
        console.warn('[proximityNotifier] native watch failed:', err);
      }
    };

    if (isNative()) {
      void startNative();
    } else if (navigator.geolocation) {
      // Web — fall back to periodic getCurrentPosition (cheap, predictable).
      const tick = () => {
        navigator.geolocation.getCurrentPosition(
          (pos) => handlePosition(pos.coords.latitude, pos.coords.longitude),
          () => undefined,
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
        );
      };
      tick();
      pollId = window.setInterval(tick, POLL_INTERVAL_MS);
    }

    return () => {
      cancelled = true;
      if (pollId !== null) window.clearInterval(pollId);
      cleanupNative?.();
    };
  }, [enabled, toast, onFire]);
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
