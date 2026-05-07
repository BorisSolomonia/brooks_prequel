import { getAccessToken } from '@auth0/nextjs-auth0';
import { NextResponse } from 'next/server';

// Bearer tokens must never sit in shared caches — proxies and CDNs would otherwise be
// able to hand the same access token to the next caller.
const NO_STORE_HEADERS = { 'Cache-Control': 'no-store, private' };

export async function GET() {
  try {
    const { accessToken } = await getAccessToken();
    return NextResponse.json({ accessToken }, { headers: NO_STORE_HEADERS });
  } catch {
    return NextResponse.json({ accessToken: null }, { status: 401, headers: NO_STORE_HEADERS });
  }
}
