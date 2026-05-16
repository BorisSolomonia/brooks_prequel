import { handleAuth, handleLogin, handleCallback } from '@auth0/nextjs-auth0';
import type { AfterCallbackAppRoute } from '@auth0/nextjs-auth0';

const API_INTERNAL = process.env.API_INTERNAL_BASE_URL ?? 'http://backend:8080';

// Native deep-link callback URI — Auth0 dashboard must list this as an
// Allowed Callback URL alongside the regular https:// one. The Android app's
// MainActivity catches this URI via the custom scheme intent-filter, JS
// extracts the code+state, then the WebView navigates to /api/auth/callback
// inside the WebView's cookie jar so the standard SDK callback completes.
const APP_REDIRECT_URI = 'uk.brooksweb.app://auth/callback';

// Cookie name we set during /api/auth/login?app=1 so /api/auth/callback knows
// to use the custom redirect_uri when exchanging the code with Auth0. Token
// exchange MUST use the same redirect_uri Auth0 saw at /authorize.
const APP_MODE_COOKIE = 'app_auth_mode';

const afterCallback: AfterCallbackAppRoute = async (_req, session) => {
  try {
    const res = await fetch(`${API_INTERNAL}/api/auth/callback`, {
      method: 'POST',
      headers: session.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {},
    });
    if (!res.ok) {
      console.error(`[auth] user provision failed: HTTP ${res.status}`);
    }
  } catch (err) {
    console.error('[auth] user provision error:', err);
  }
  return session;
};

function detectAppMode(req: { url?: string | null; nextUrl?: URL; cookies?: { get(name: string): { value: string } | undefined } }): boolean {
  // Either ?app=1 query param (login init) or app_auth_mode cookie (callback).
  const baseUrl = process.env.AUTH0_BASE_URL ?? 'http://localhost:3000';
  const url = req.nextUrl ?? new URL(req.url ?? '/', baseUrl);
  if (url.searchParams.get('app') === '1') return true;
  const cookieVal = req.cookies?.get?.(APP_MODE_COOKIE)?.value;
  return cookieVal === '1';
}

export const GET = handleAuth({
  login: handleLogin((req) => {
    const baseUrl = process.env.AUTH0_BASE_URL ?? 'http://localhost:3000';
    const url = 'nextUrl' in req
      ? req.nextUrl
      : new URL(req.url ?? '/', baseUrl);
    const requestedReturnTo = url.searchParams.get('returnTo');
    // Open-redirect guard. Rejects:
    //   - protocol-relative URLs (//evil.com)
    //   - URLs with backslashes (/\evil.com — some browsers normalize \ to / and treat
    //     the result as protocol-relative)
    //   - any path that resolves to a different origin
    const returnTo = (() => {
      if (!requestedReturnTo) return '/maps';
      if (!requestedReturnTo.startsWith('/')) return '/maps';
      if (requestedReturnTo.startsWith('//')) return '/maps';
      if (requestedReturnTo.includes('\\')) return '/maps';
      try {
        const resolved = new URL(requestedReturnTo, baseUrl);
        return resolved.origin === new URL(baseUrl).origin ? requestedReturnTo : '/maps';
      } catch {
        return '/maps';
      }
    })();

    const isApp = url.searchParams.get('app') === '1';

    return {
      returnTo,
      authorizationParams: {
        audience: process.env.AUTH0_AUDIENCE,
        connection: url.searchParams.get('connection') ?? undefined,
        // When app=1, force Auth0 to call back to the custom URI scheme so
        // Android intercepts via the app's intent-filter. The Custom Tab
        // can't follow custom-scheme URIs, so this guarantees the redirect
        // leaves the browser and lands in our app.
        ...(isApp ? { redirect_uri: APP_REDIRECT_URI } : {}),
      },
    };
  }),
  callback: handleCallback((req) => {
    const isApp = detectAppMode(req as Parameters<typeof detectAppMode>[0]);
    return {
      // Token exchange must use the same redirect_uri Auth0 saw at /authorize.
      // For app-initiated flows this is the custom scheme; for web it's the
      // standard /api/auth/callback URL.
      redirectUri: isApp
        ? APP_REDIRECT_URI
        : (process.env.AUTH0_BASE_URL + '/api/auth/callback'),
      afterCallback,
    };
  }),
});
