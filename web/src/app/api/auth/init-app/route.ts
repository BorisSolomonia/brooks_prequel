import { handleLogin } from '@auth0/nextjs-auth0';
import { NextRequest, NextResponse } from 'next/server';

// Native deep-link callback URI — Auth0 dashboard must list this as an
// Allowed Callback URL. The app's MainActivity catches it via the custom
// scheme intent-filter in AndroidManifest.xml.
const APP_REDIRECT_URI = 'uk.brooksweb.app://auth/callback';

// Compose a handleLogin handler that:
//   - asks Auth0 to redirect to the custom URI scheme (not https://brooksweb.uk)
//   - uses the same audience as the regular flow
//   - returns to /maps after callback completes
//
// We invoke this handler programmatically below and translate its 302 response
// into a JSON body so the WebView's JS can read the authorize URL and open it
// in a Capacitor Custom Tab. The SDK sets `auth_verification` via
// `res.cookies.set(...)` (see auth0-next-response.js) — we must copy via the
// .cookies API too, NOT headers.getSetCookie() which returns empty because
// the cookies live in NextResponse's internal cookie store until serialization.
const appLoginHandler = handleLogin({
  returnTo: '/maps',
  authorizationParams: {
    audience: process.env.AUTH0_AUDIENCE,
    redirect_uri: APP_REDIRECT_URI,
  },
});

export async function GET(req: NextRequest) {
  // Synthetic dynamic-route context — handleLogin is normally invoked by
  // handleAuth which provides {params: {auth0: ['login']}}. We mimic that.
  const ctx = { params: { auth0: ['login'] } };
  let upstream: NextResponse;
  try {
    upstream = (await appLoginHandler(req, ctx)) as NextResponse;
  } catch (err) {
    console.error('[auth init-app] handleLogin threw:', err);
    return NextResponse.json({ error: 'login_init_failed' }, { status: 500 });
  }

  const authorizeUrl = upstream.headers.get('Location');
  if (!authorizeUrl) {
    console.error('[auth init-app] no Location header from handleLogin');
    return NextResponse.json({ error: 'no_authorize_url' }, { status: 500 });
  }

  const json = NextResponse.json({ authorizeUrl });

  // Copy cookies via the NextResponse .cookies API. The SDK sets cookies via
  // res.cookies.set() — those live in the internal cookies store and are only
  // serialized to the Set-Cookie header when the response is sent. Reading via
  // headers.getSetCookie() during construction returns empty.
  for (const cookie of upstream.cookies.getAll()) {
    json.cookies.set(cookie);
  }

  // Mark this auth flow as app-initiated so the callback handler knows to use
  // the custom-scheme redirect_uri when exchanging the code with Auth0
  // (token-exchange redirect_uri MUST match what /authorize received).
  json.cookies.set('app_auth_mode', '1', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });

  return json;
}
