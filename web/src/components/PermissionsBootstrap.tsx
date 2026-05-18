'use client';

import { useEffect, useState } from 'react';
import { isNative, platform as detectPlatform } from '@/lib/capacitor';
import { useAccessToken } from '@/hooks/useAccessToken';
import { api } from '@/lib/api';

// Triggers the location + notification permission system dialogs on the
// first launch after install, AND captures the FCM device token to POST
// to the backend so the server can send pushes to this device.
//
// Why this needs the plugins (not the web APIs):
//   • navigator.geolocation inside a Capacitor WebView is the BROWSER
//     geolocation API. It is sandboxed from the Android permission system
//     and never surfaces a native dialog on its own. Use @capacitor/
//     geolocation instead, which bridges to Android's LocationManager.
//   • @capacitor/push-notifications is the bridge for POST_NOTIFICATIONS
//     and FCM registration. The registration listener fires with the FCM
//     token AFTER the user grants permission AND register() resolves.
//
// Flow:
//   First install:
//     1. Show location permission dialog → tap Allow → granted at OS level
//     2. Show notifications dialog → tap Allow → register with FCM
//     3. FCM returns a token → cache in localStorage
//   Every app open:
//     4. POST cached FCM token to /api/me/device-tokens (idempotent upsert)
//
// Token can rotate (Google rotates them periodically). The registration
// listener fires whenever a new token arrives; we always POST the latest.
// The backend upserts on token uniqueness so duplicate POSTs are cheap.

const PERM_BOOTSTRAP_KEY = 'brooks.permissionsBootstrap.v2';
const FCM_TOKEN_KEY = 'brooks.fcmToken.v1';

export default function PermissionsBootstrap() {
  const { token: authToken } = useAccessToken();
  const [fcmToken, setFcmToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(FCM_TOKEN_KEY);
  });

  // Permission dialogs + FCM registration (fires once per install).
  useEffect(() => {
    if (!isNative()) return;
    if (typeof window === 'undefined') return;

    let cancelled = false;
    const firstRun = window.localStorage.getItem(PERM_BOOTSTRAP_KEY) !== '1';

    const run = async () => {
      // LOCATION — first-run dialog only.
      if (firstRun) {
        try {
          // @ts-ignore - resolved at runtime via npm install
          const mod = await import('@capacitor/geolocation');
          if (cancelled) return;
          const { Geolocation } = mod;
          const current = await Geolocation.checkPermissions();
          if (current.location !== 'granted' && current.location !== 'denied') {
            const result = await Geolocation.requestPermissions({
              permissions: ['location'],
            });
            if (result.location === 'granted') {
              void Geolocation.getCurrentPosition({
                enableHighAccuracy: false,
                timeout: 8000,
              }).catch(() => undefined);
            }
          }
        } catch (err) {
          console.error('[PermissionsBootstrap] location:', err);
        }
      }

      // NOTIFICATIONS — request once, but re-register every cold start so
      // a rotated FCM token gets re-emitted via the registration listener.
      try {
        const mod = await import('@capacitor/push-notifications');
        if (cancelled) return;
        const { PushNotifications } = mod;

        // Attach the token listener BEFORE register() so we never miss
        // the first emission.
        await PushNotifications.addListener('registration', (t) => {
          if (cancelled) return;
          if (!t?.value) return;
          setFcmToken(t.value);
          try {
            window.localStorage.setItem(FCM_TOKEN_KEY, t.value);
          } catch {
            /* localStorage may be unavailable in incognito; ignore. */
          }
        });
        await PushNotifications.addListener('registrationError', (err) => {
          console.error('[PermissionsBootstrap] registration error:', err);
        });

        let permission = await PushNotifications.checkPermissions();
        if (firstRun && permission.receive !== 'granted' && permission.receive !== 'denied') {
          permission = await PushNotifications.requestPermissions();
        }
        if (permission.receive === 'granted') {
          await PushNotifications.register();
        }
      } catch (err) {
        console.error('[PermissionsBootstrap] notifications:', err);
      }

      if (firstRun && !cancelled) {
        window.localStorage.setItem(PERM_BOOTSTRAP_KEY, '1');
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  // POST the FCM token whenever we have BOTH the auth token AND the FCM
  // token. Runs on every cold start; the backend upserts so duplicates
  // are cheap. Stays silent on failure — push isn't critical-path.
  useEffect(() => {
    if (!authToken || !fcmToken) return;
    if (!isNative()) return;
    const platformName = detectPlatform().toUpperCase();
    void api
      .post(
        '/api/me/device-tokens',
        { token: fcmToken, platform: platformName },
        authToken,
      )
      .catch((err) => {
        console.warn('[PermissionsBootstrap] device token POST failed:', err);
      });
  }, [authToken, fcmToken]);

  return null;
}
