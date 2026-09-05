'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isNative, platform as detectPlatform } from '@/lib/capacitor';
import { useAccessToken } from '@/hooks/useAccessToken';
import { api } from '@/lib/api';
import {
  PUSH_PERMISSION_REQUEST_EVENT,
  publishPushPermissionStatus,
} from '@/lib/pushPermission';

// Registers native notification listeners and captures the FCM token. It never
// prompts at launch: the map requests location in context, and the notification
// tray requests push permission only after an explicit user action.
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
// Token can rotate (Google rotates them periodically). The registration
// listener fires whenever a new token arrives; we always POST the latest.
// The backend upserts on token uniqueness so duplicate POSTs are cheap.

const FCM_TOKEN_KEY = 'brooks.fcmToken.v1';

export default function PermissionsBootstrap() {
  const router = useRouter();
  const { token: authToken } = useAccessToken();
  const [fcmToken, setFcmToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(FCM_TOKEN_KEY);
  });

  // Listener setup + FCM registration. Permission prompts are contextual.
  useEffect(() => {
    if (!isNative()) return;
    if (typeof window === 'undefined') return;

    let cancelled = false;
    const listenerHandles: Array<{ remove: () => Promise<void> }> = [];
    let permissionRequestHandler: (() => void) | null = null;

    const run = async () => {
      try {
        const mod = await import('@capacitor/push-notifications');
        if (cancelled) return;
        const { PushNotifications } = mod;

        // Attach the token listener BEFORE register() so we never miss
        // the first emission.
        listenerHandles.push(await PushNotifications.addListener('registration', (t) => {
          if (cancelled) return;
          if (!t?.value) return;
          console.info('[PermissionsBootstrap] FCM token received:', t.value.slice(0, 12) + '...');
          setFcmToken(t.value);
          try {
            window.localStorage.setItem(FCM_TOKEN_KEY, t.value);
          } catch {
            /* localStorage may be unavailable in incognito; ignore. */
          }
        }));
        listenerHandles.push(await PushNotifications.addListener('registrationError', (err) => {
          console.error('[PermissionsBootstrap] registration error:', err);
        }));

        // System-tray push tap → deep-link into the matching in-app screen.
        // The data payload mirrors the in-app bell's switch (NotificationBell.tsx)
        // so behaviour is identical whether the user taps the OS notification
        // or the in-app row. The payload comes through as data.notification.data
        // on Android; @capacitor/push-notifications also flattens fields onto
        // the top-level notification object on iOS — we read both shapes.
        listenerHandles.push(await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          if (cancelled) return;
          const raw = (action.notification as { data?: Record<string, string> }).data ?? {};
          const type = raw.type;
          console.info('[PermissionsBootstrap] push tap type=', type, 'data=', raw);
          try {
            if (type === 'memory.direct-share' || type === 'memory.reply') {
              // memory.reply deep-links to the ORIGINAL memory (data.memoryId = parent), so the
              // author opens their pin and sees the reply that was added to it.
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
        }));

        let permission = await PushNotifications.checkPermissions();
        console.info('[PermissionsBootstrap] notifications current:', permission.receive);
        publishPushPermissionStatus(permission.receive);
        if (permission.receive === 'granted') {
          console.info('[PermissionsBootstrap] calling PushNotifications.register()');
          await PushNotifications.register();
        }

        const handlePermissionRequest = async () => {
          try {
            permission = await PushNotifications.checkPermissions();
            if (permission.receive !== 'granted' && permission.receive !== 'denied') {
              permission = await PushNotifications.requestPermissions();
            }
            publishPushPermissionStatus(permission.receive);
            if (permission.receive === 'granted') {
              await PushNotifications.register();
            }
          } catch (err) {
            console.error('[PermissionsBootstrap] permission request failed:', err);
          }
        };
        permissionRequestHandler = () => void handlePermissionRequest();
        window.addEventListener(PUSH_PERMISSION_REQUEST_EVENT, permissionRequestHandler);

        // Local-notification taps (arrival proximity alerts) deep-link to the memory, mirroring
        // the push tap routing above.
        try {
          const { LocalNotifications } = await import('@capacitor/local-notifications');
          listenerHandles.push(await LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
            if (cancelled) return;
            const extra = (event.notification as { extra?: Record<string, string> })?.extra ?? {};
            if (extra.memoryId) router.push(`/maps?memory=${encodeURIComponent(extra.memoryId)}`);
            else router.push('/maps');
          }));
        } catch (err) {
          console.warn('[PermissionsBootstrap] local notification listener failed:', err);
        }
      } catch (err) {
        console.error('[PermissionsBootstrap] notifications:', err);
      }

    };

    void run();
    return () => {
      cancelled = true;
      if (permissionRequestHandler) {
        window.removeEventListener(PUSH_PERMISSION_REQUEST_EVENT, permissionRequestHandler);
      }
      listenerHandles.forEach((handle) => void handle.remove());
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
