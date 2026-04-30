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
    const url = 'nextUrl' in req
      ? req.nextUrl
      : new URL(req.url ?? '/', process.env.AUTH0_BASE_URL ?? 'http://localhost:3000');
    const requestedReturnTo = url.searchParams.get('returnTo');
    const returnTo = requestedReturnTo?.startsWith('/') && !requestedReturnTo.startsWith('//')
      ? requestedReturnTo
      : '/maps';

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
