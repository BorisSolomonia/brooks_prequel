import { getAccessToken } from '@auth0/nextjs-auth0';
import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL =
  process.env.API_INTERNAL_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  '';

export async function GET(request: NextRequest) {
  const expectedState = request.cookies.get('brooks_google_calendar_state')?.value;
  const returnTo = request.cookies.get('brooks_google_calendar_return_to')?.value || '/trips';
  const state = request.nextUrl.searchParams.get('state');
  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error');
  const destination = new URL(returnTo, request.url);

  const redirect = () => {
    const response = NextResponse.redirect(destination);
    response.cookies.delete('brooks_google_calendar_state');
    response.cookies.delete('brooks_google_calendar_return_to');
    return response;
  };

  if (error) {
    destination.searchParams.set('calendarError', error);
    return redirect();
  }

  if (!expectedState || state !== expectedState || !code) {
    destination.searchParams.set('calendarError', 'invalid_google_state');
    return redirect();
  }

  try {
    const { accessToken } = await getAccessToken();
    const redirectUri = new URL('/api/calendar/google/callback', request.url).toString();
    const backendResponse = await fetch(`${API_BASE_URL}/api/me/calendar/google/connect`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, redirectUri }),
      cache: 'no-store',
    });

    if (!backendResponse.ok) {
      const problem = await backendResponse.json().catch(() => ({ detail: 'google_connect_failed' }));
      destination.searchParams.set('calendarError', problem.detail || 'google_connect_failed');
      return redirect();
    }
    destination.searchParams.set('calendarConnected', 'google');
    return redirect();
  } catch (err) {
    destination.searchParams.set('calendarError', err instanceof Error ? err.message : 'google_connect_failed');
    return redirect();
  }
}
