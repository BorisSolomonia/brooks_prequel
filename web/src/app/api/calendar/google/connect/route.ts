import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken } from '@auth0/nextjs-auth0';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const SCOPE = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email';

export async function GET(request: NextRequest) {
  try {
    await getAccessToken();
  } catch {
    return NextResponse.redirect(new URL('/api/auth/login', request.url));
  }

  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ detail: 'Google Calendar is not configured' }, { status: 500 });
  }

  const state = randomUUID();
  const returnTo = request.nextUrl.searchParams.get('returnTo') || '/trips';
  const redirectUri = new URL('/api/calendar/google/callback', request.url).toString();
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', SCOPE);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('state', state);

  const response = NextResponse.redirect(url);
  response.cookies.set('brooks_google_calendar_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 10 * 60,
  });
  response.cookies.set('brooks_google_calendar_return_to', returnTo, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 10 * 60,
  });
  return response;
}
