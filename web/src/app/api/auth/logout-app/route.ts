import { handleLogout } from '@auth0/nextjs-auth0';
import { NextRequest, NextResponse } from 'next/server';

// Native logout counterpart to /api/auth/init-app.
//
// The app's login completes in a Custom Tab, so the Auth0 SSO cookie lives in
// Chrome's cookie jar while the local SDK session cookie lives in the WebView's
// jar. A WebView-only logout clears the local session but its /v2/logout
// redirect does a flaky App-Link round-trip out through external Chrome and
// back — the cause of the "logout needs two clicks" bounce.
//
// This route invokes the SDK's handleLogout programmatically (exactly as
// init-app invokes handleLogin): the SDK clears the local session cookie
// (including any chunked appSession.* cookies) and returns a 302 whose Location
// is the Auth0 /v2/logout URL. We translate that 302 into JSON so the WebView's
// JS can clear the local session here (via the copied Set-Cookie) and open the
// /v2/logout URL in a Custom Tab — clearing the SSO session in the SAME jar
// login used. No redirect is performed by this route itself.
const logoutHandler = handleLogout({
  returnTo: process.env.AUTH0_BASE_URL,
});

export async function GET(req: NextRequest) {
  // Synthetic dynamic-route context — handleLogout is normally invoked by
  // handleAuth which provides { params: { auth0: ['logout'] } }. We mimic that,
  // matching the pattern used by /api/auth/init-app for handleLogin.
  const ctx = { params: { auth0: ['logout'] } };
  let upstream: NextResponse;
  try {
    upstream = (await logoutHandler(req, ctx)) as NextResponse;
  } catch (err) {
    console.error('[auth logout-app] handleLogout threw:', err);
    return NextResponse.json({ error: 'logout_init_failed' }, { status: 500 });
  }

  const logoutUrl = upstream.headers.get('Location');
  if (!logoutUrl) {
    console.error('[auth logout-app] no Location header from handleLogout');
    return NextResponse.json({ error: 'no_logout_url' }, { status: 500 });
  }

  const json = NextResponse.json({ logoutUrl });

  // Copy the SDK's session-clearing cookies (handles chunked appSession.* too).
  // Same .cookies-API copy technique init-app uses — headers.getSetCookie()
  // returns empty until the response is serialized.
  for (const cookie of upstream.cookies.getAll()) {
    json.cookies.set(cookie);
  }

  return json;
}
