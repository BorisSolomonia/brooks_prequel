import { NextResponse } from 'next/server';

// Prices are pinned to GEL because Bank of Georgia iPay only supports GEL.
// The IP-based currency detection was removed when the payment integration
// switched from a multi-currency provider to BOG iPay.
// No display-currency cookie is set: nothing reads it (useCurrency keeps the
// choice in localStorage), and a Set-Cookie on every page makes Cloudflare
// refuse to store public pages at the edge.
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon).*)'],
};
