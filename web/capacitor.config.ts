import type { CapacitorConfig } from '@capacitor/cli';

// Sub-path 2A: the WebView loads the live production site directly. The bundled
// `webDir` is just an offline-fallback shell shown when the network is unreachable.
const config: CapacitorConfig = {
  appId: 'uk.brooksweb.app',
  appName: 'Brooks',
  webDir: 'capacitor-fallback',
  server: {
    url: 'https://brooksweb.uk',
    androidScheme: 'https',
    // Domains the WebView is allowed to navigate to without leaving the app.
    // Auth0 + Google + iPay + Mapbox tiles + GCS media all need to load here.
    allowNavigation: [
      'brooksweb.uk',
      '*.brooksweb.uk',
      '*.auth0.com',
      'accounts.google.com',
      'oauth2.googleapis.com',
      '*.googleapis.com',
      '*.gstatic.com',
      'pay.google.com',
      '*.mapbox.com',
      'api.mapbox.com',
      'events.mapbox.com',
      'storage.googleapis.com',
      'ipay.ge',
      '*.bog.ge',
    ],
  },
  ios: {
    contentInset: 'always',
    limitsNavigationsToAppBoundDomains: true,
  },
  android: {
    allowMixedContent: false,
    // Android 13+ requires runtime POST_NOTIFICATIONS permission. The plugin
    // requests it on first call; nothing to do here beyond installing the
    // plugin and declaring the permission in AndroidManifest.xml (see
    // BUILD_ANDROID.md step 5).
  },
  plugins: {
    SplashScreen: {
      // The web app calls SplashScreen.hide() from AppShell the moment React
      // hydrates (see web/src/lib/capacitor.ts hideSplash), so on a normal load
      // the splash drops as soon as content paints — typically well under the
      // old fixed 1.5s. autoHide stays ON as a safety net: launchShowDuration is
      // now just the ceiling if that JS call never runs (e.g. a load failure),
      // and it's raised so a slow network keeps the branded splash up instead of
      // flashing a blank WebView at 1.5s.
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: '#F7F1E7',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
