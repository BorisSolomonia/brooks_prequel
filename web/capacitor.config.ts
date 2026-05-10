import type { CapacitorConfig } from '@capacitor/cli';

// Sub-path 2A: the WebView loads the live production site directly. The bundled
// `webDir` is just an offline-fallback shell shown when the network is unreachable.
const config: CapacitorConfig = {
  appId: 'uk.brooksweb.app',
  appName: 'Brooks',
  webDir: 'capacitor-fallback',
  server: {
    url: 'https://brooksweb.uk',
    cleartext: false,
  },
  ios: {
    contentInset: 'always',
    limitsNavigationsToAppBoundDomains: true,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
