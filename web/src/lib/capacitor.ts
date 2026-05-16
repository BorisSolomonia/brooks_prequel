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
//
// For Auth0 login this is invoked via `openAuthFlow()` below, which does the
// extra work of priming the WebView with auth cookies before opening the tab.
export async function openExternalAuth(url: string): Promise<void> {
  if (!isNative()) {
    window.location.href = url;
    return;
  }
  await openInCustomTab(url);
}

async function openInCustomTab(url: string): Promise<void> {
  try {
    const pkg = '@capacitor/browser';
    const mod = (await import(/* webpackIgnore: true */ pkg)) as {
      Browser?: { open: (opts: { url: string; presentationStyle?: string }) => Promise<void> };
    };
    if (mod.Browser?.open) {
      await mod.Browser.open({ url, presentationStyle: 'fullscreen' });
      return;
    }
    window.location.href = url;
  } catch {
    window.location.href = url;
  }
}

// Full Auth0 deep-link flow for Capacitor:
//   1. WebView hits /api/auth/init-app — server sets the SDK's auth_verification
//      cookie + app_auth_mode cookie on the WebView's cookie jar, returns the
//      Auth0 authorize URL (with redirect_uri=uk.brooksweb.app://auth/callback).
//   2. JS opens the authorize URL in a Custom Tab (so Google's WebView block
//      doesn't apply).
//   3. User signs in inside the Custom Tab.
//   4. Auth0 redirects to uk.brooksweb.app://auth/callback?code=...&state=...
//   5. Android's intent-filter routes the URI to the Brooks app.
//   6. @capacitor/app's appUrlOpen listener (see setupNativeAuthListener) fires
//      in the WebView's JS — we navigate the WebView to /api/auth/callback?...
//   7. The WebView's request includes the cookies from step 1; the SDK
//      validates state + exchanges the code with the custom redirect_uri (it
//      reads `app_auth_mode` cookie to know which URI to use); session cookie
//      lands in the WebView's jar; redirect to /maps.
//   8. WebView is now signed in.
//
// On non-native (regular Web), this falls back to the standard SDK flow —
// just navigate to /api/auth/login.
export async function startAuthFlow(returnTo?: string): Promise<void> {
  if (!isNative()) {
    const target = returnTo
      ? `/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`
      : '/api/auth/login';
    window.location.href = target;
    return;
  }

  try {
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
    await openInCustomTab(data.authorizeUrl);
  } catch (err) {
    // If anything in the native handover path fails, fall back so the user
    // doesn't end up stuck. Mobile Chrome will then handle the OAuth flow.
    console.warn('[capacitor] native auth init failed, falling back to web flow:', err);
    window.location.href = '/api/auth/login';
  }
}

// Registers a listener for incoming deep-link URIs (uk.brooksweb.app://...).
// Called once at app startup from AppShell. On the web this is a no-op.
//
// When Auth0 sends the user back via the custom URI scheme, this listener
// picks up the code+state from the URI and navigates the main WebView to
// the regular /api/auth/callback endpoint, where the SDK completes token
// exchange using the cookies set during startAuthFlow().
export async function setupNativeAuthListener(): Promise<() => void> {
  if (!isNative()) return () => {};
  try {
    const pkg = '@capacitor/app';
    const mod = (await import(/* webpackIgnore: true */ pkg)) as {
      App?: {
        addListener: (
          event: 'appUrlOpen',
          handler: (data: { url: string }) => void,
        ) => Promise<{ remove: () => Promise<void> }> | { remove: () => void };
      };
    };
    if (!mod.App?.addListener) return () => {};
    const handle = await mod.App.addListener('appUrlOpen', (data) => {
      try {
        const url = new URL(data.url);
        // Only handle our OAuth callback scheme; ignore other deep links.
        if (url.protocol.replace(':', '') !== 'uk.brooksweb.app') return;
        if (!url.pathname.endsWith('/auth/callback') && url.host !== 'auth') return;
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        if (!code || !state) return;
        // Navigate the main WebView to the regular SDK callback. Cookies were
        // set during init-app; the SDK reads `app_auth_mode` and uses the
        // custom redirect_uri for token exchange.
        const target = `/api/auth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
        window.location.href = target;
      } catch (err) {
        console.error('[capacitor] appUrlOpen handler failed:', err);
      }
    });
    return () => {
      // `handle` may be either a synchronous or a Promise-resolving object
      // depending on Capacitor version.
      const maybeRemove = (handle as { remove?: () => unknown }).remove;
      if (typeof maybeRemove === 'function') void maybeRemove();
    };
  } catch (err) {
    console.warn('[capacitor] setupNativeAuthListener failed:', err);
    return () => {};
  }
}
