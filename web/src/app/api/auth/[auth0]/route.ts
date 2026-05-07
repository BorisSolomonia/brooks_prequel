import { handleAuth, handleLogin, handleCallback } from '@auth0/nextjs-auth0';
import type { AfterCallbackAppRoute } from '@auth0/nextjs-auth0';

const API_INTERNAL = process.env.API_INTERNAL_BASE_URL ?? 'http://backend:8080';

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

    return {
      returnTo,
      authorizationParams: {
        audience: process.env.AUTH0_AUDIENCE,
        connection: url.searchParams.get('connection') ?? undefined,
      },
    };
  }),
  callback: handleCallback({
    redirectUri: process.env.AUTH0_BASE_URL + '/api/auth/callback',
    afterCallback,
  }),
});
