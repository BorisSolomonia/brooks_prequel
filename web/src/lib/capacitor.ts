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
// Used for Auth0 login because Google blocks OAuth screens inside generic
// WebViews with `disallowed_useragent`. Custom Tab is an allowed user agent.
export async function openExternalAuth(url: string): Promise<void> {
  if (!isNative()) {
    window.location.href = url;
    return;
  }
  try {
    // String-typed import keeps TS happy before `npm install` adds the package.
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
    // Plugin missing — fall back so we never leave the user stuck.
    window.location.href = url;
  }
}
