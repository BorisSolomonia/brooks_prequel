// Capacitor bridge helpers. Safe to import from both server and client code:
// every branch is guarded so the web bundle stays unaffected when not running
// inside the native shell.

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
};

function getCapacitor(): CapacitorGlobal | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { Capacitor?: CapacitorGlobal };
  return w.Capacitor ?? null;
}

export function isNative(): boolean {
  const cap = getCapacitor();
  return !!cap?.isNativePlatform?.();
}

export function platform(): 'web' | 'ios' | 'android' {
  const cap = getCapacitor();
  const p = cap?.getPlatform?.() ?? 'web';
  return p === 'ios' || p === 'android' ? p : 'web';
}

// Opens an external URL in an Android Custom Tab / iOS SFSafariViewController
// when running inside Capacitor. On web (or if the plugin isn't loaded yet)
// falls back to a plain location change so the existing flow keeps working.
export async function openExternalAuth(url: string): Promise<void> {
  if (!isNative()) {
    window.location.href = url;
    return;
  }
  await openInCustomTab(url);
}

async function openInCustomTab(url: string): Promise<void> {
  try {
    // String-literal dynamic import so webpack actually bundles @capacitor/browser
    // as a code-split chunk. The previous webpackIgnore variant was failing
    // silently at runtime — the browser can't resolve bare specifiers without
    // a bundler, so `await import('@capacitor/browser')` would throw and we'd
    // fall back to window.location.href (which navigates the WebView to Auth0
    // — exactly the wrong thing, because Google blocks WebView OAuth).
    const mod = await import('@capacitor/browser');
    if (mod.Browser?.open) {
      await mod.Browser.open({ url, presentationStyle: 'fullscreen' });
      return;
    }
    console.warn('[capacitor] Browser plugin loaded but .open missing');
    window.location.href = url;
  } catch (err) {
    console.warn('[capacitor] Browser plugin import failed:', err);
    window.location.href = url;
  }
}

// Full Auth0 deep-link flow for Capacitor:
//   1. WebView hits /api/auth/init-app — server sets the SDK's auth_verification
//      cookie + app_auth_mode cookie on the WebView's cookie jar, returns the
//      Auth0 authorize URL (with redirect_uri=uk.brooksweb.app://auth/callback).
//   2. JS opens the authorize URL in a Custom Tab.
//   3. User signs in inside the Custom Tab.
//   4. Auth0 redirects to uk.brooksweb.app://auth/callback?code=...&state=...
//   5. Android's intent-filter routes the URI to the Brooks app.
//   6. @capacitor/app's appUrlOpen listener (see setupNativeAuthListener) fires
//      in the WebView's JS — we navigate the WebView to /api/auth/callback?...
//   7. The WebView's request includes the cookies from step 1; the SDK
//      validates state + exchanges the code with the custom redirect_uri.
//   8. WebView is signed in.
//
// On non-native (regular Web), this falls back to the standard SDK flow.
export async function startAuthFlow(returnTo?: string): Promise<void> {
  if (!isNative()) {
    const target = returnTo
      ? `/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`
      : '/api/auth/login';
    window.location.href = target;
    return;
  }

  try {
    console.info('[capacitor] startAuthFlow: fetching /api/auth/init-app');
    const res = await fetch('/api/auth/init-app', {
      method: 'GET',
      credentials: 'same-origin',
    });
    if (!res.ok) {
      throw new Error(`init-app HTTP ${res.status}`);
    }
    const data = (await res.json()) as { authorizeUrl?: string; error?: string };
    if (!data.authorizeUrl) {
      throw new Error(data.error || 'no authorize URL returned');
    }
    console.info('[capacitor] startAuthFlow: opening Custom Tab');
    await openInCustomTab(data.authorizeUrl);
  } catch (err) {
    console.warn('[capacitor] native auth init failed, falling back to web flow:', err);
    window.location.href = '/api/auth/login';
  }
}

// Registers a listener for incoming deep-link URIs (uk.brooksweb.app://...).
// Called once at app startup from AppShell. On the web this is a no-op.
export async function setupNativeAuthListener(): Promise<() => void> {
  if (!isNative()) return () => {};
  try {
    // Same fix as openInCustomTab: string-literal import so webpack bundles
    // @capacitor/app properly. Previously the webpackIgnore variant was
    // failing silently, so the deep link came in but no JS listener caught it.
    const mod = await import('@capacitor/app');
    if (!mod.App?.addListener) {
      console.warn('[capacitor] App.addListener missing — plugin not registered');
      return () => {};
    }
    console.info('[capacitor] registering appUrlOpen listener');
    const handle = await mod.App.addListener('appUrlOpen', (data) => {
      console.info('[capacitor] appUrlOpen fired:', data.url);
      try {
        const url = new URL(data.url);
        // Only handle our OAuth callback scheme; ignore other deep links.
        if (url.protocol !== 'uk.brooksweb.app:') {
          console.info('[capacitor] ignoring non-auth scheme:', url.protocol);
          return;
        }
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        if (!code || !state) {
          console.warn('[capacitor] appUrlOpen URL missing code/state:', data.url);
          return;
        }
        // Navigate the main WebView to the regular SDK callback. Cookies were
        // set during init-app; the SDK reads `app_auth_mode` and uses the
        // custom redirect_uri for token exchange.
        const target = `/api/auth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
        console.info('[capacitor] navigating WebView to:', target);
        window.location.href = target;
      } catch (err) {
        console.error('[capacitor] appUrlOpen handler failed:', err);
      }
    });
    return () => {
      const maybeRemove = (handle as { remove?: () => unknown }).remove;
      if (typeof maybeRemove === 'function') void maybeRemove();
    };
  } catch (err) {
    console.warn('[capacitor] setupNativeAuthListener failed:', err);
    return () => {};
  }
}
