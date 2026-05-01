import { NextResponse } from 'next/server';

// Prices are pinned to GEL because Bank of Georgia iPay only supports GEL.
// The IP-based currency detection was removed when the payment integration
// switched from a multi-currency provider to BOG iPay.
export function middleware() {
  const response = NextResponse.next();
  response.cookies.set('display-currency', 'GEL', { maxAge: 86400, path: '/' });
  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon).*)'],
};
