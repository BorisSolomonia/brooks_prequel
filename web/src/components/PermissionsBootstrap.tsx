'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
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
      // LOCATION — always check the OS state first. If "prompt", request
      // regardless of our localStorage sentinel: the sentinel can outlive
      // the actual permission grant (uninstall+reinstall, app-data wipe,
      // or user revokes in Settings then opens app again).
      try {
        // @ts-ignore - resolved at runtime via npm install
        const mod = await import('@capacitor/geolocation');
        if (cancelled) return;
        const { Geolocation } = mod;
        const current = await Geolocation.checkPermissions();
        console.info('[PermissionsBootstrap] location current:', current.location);
        if (current.location !== 'granted' && current.location !== 'denied') {
          console.info('[PermissionsBootstrap] requesting location dialog');
          const result = await Geolocation.requestPermissions({
            permissions: ['location'],
          });
          console.info('[PermissionsBootstrap] location result:', result.location);
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

      // NOTIFICATIONS — same logic: check OS state, request whenever it's
      // "prompt". Sentinel is no longer used to gate the dialog. Then
      // re-register every cold start so a rotated FCM token gets emitted.
      try {
        const mod = await import('@capacitor/push-notifications');
        if (cancelled) return;
        const { PushNotifications } = mod;

        // Attach the token listener BEFORE register() so we never miss
        // the first emission.
        await PushNotifications.addListener('registration', (t) => {
          if (cancelled) return;
          if (!t?.value) return;
          console.info('[PermissionsBootstrap] FCM token received:', t.value.slice(0, 12) + '...');
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

        // System-tray push tap → deep-link into the matching in-app screen.
        // The data payload mirrors the in-app bell's switch (NotificationBell.tsx)
        // so behaviour is identical whether the user taps the OS notification
        // or the in-app row. The payload comes through as data.notification.data
        // on Android; @capacitor/push-notifications also flattens fields onto
        // the top-level notification object on iOS — we read both shapes.
        await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          if (cancelled) return;
          const raw = (action.notification as { data?: Record<string, string> }).data ?? {};
          const type = raw.type;
          console.info('[PermissionsBootstrap] push tap type=', type, 'data=', raw);
          try {
            if (type === 'memory.direct-share') {
              if (raw.memoryId) router.push(`/maps?memory=${encodeURIComponent(raw.memoryId)}`);
              else router.push('/maps');
            } else if (type === 'follow') {
              if (raw.followerUsername) router.push(`/creators/${encodeURIComponent(raw.followerUsername)}`);
              else router.push('/maps');
            } else {
              router.push('/maps');
            }
          } catch (err) {
            console.warn('[PermissionsBootstrap] push tap routing failed:', err);
          }
        });

        let permission = await PushNotifications.checkPermissions();
        console.info('[PermissionsBootstrap] notifications current:', permission.receive);
        if (permission.receive !== 'granted' && permission.receive !== 'denied') {
          console.info('[PermissionsBootstrap] requesting notifications dialog');
          permission = await PushNotifications.requestPermissions();
          console.info('[PermissionsBootstrap] notifications result:', permission.receive);
        }
        if (permission.receive === 'granted') {
          console.info('[PermissionsBootstrap] calling PushNotifications.register()');
          await PushNotifications.register();
        } else {
          console.warn('[PermissionsBootstrap] notifications NOT granted — push disabled');
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
    // router is intentionally omitted: registration must fire once per cold
    // start, and Next.js's useRouter return value is stable for the lifetime
    // of the component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // POST the FCM token whenever we have BOTH the auth token AND the FCM
  // token. Runs on every cold start; the backend upserts so duplicates
  // are cheap. Surfaces failures via console for diagnostic visibility.
  useEffect(() => {
    if (!authToken || !fcmToken) return;
    if (!isNative()) return;
    const platformName = detectPlatform().toUpperCase();
    console.info('[PermissionsBootstrap] POST /api/me/device-tokens with', platformName, 'token=' + fcmToken.slice(0, 12) + '...');
    void api
      .post(
        '/api/me/device-tokens',
        { token: fcmToken, platform: platformName },
        authToken,
      )
      .then(() => console.info('[PermissionsBootstrap] device token POST OK'))
      .catch((err) => {
        console.error('[PermissionsBootstrap] device token POST failed:', err);
      });
  }, [authToken, fcmToken]);

  return null;
}
