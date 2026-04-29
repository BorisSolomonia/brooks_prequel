import { NextRequest, NextResponse } from 'next/server';

const EUROZONE = new Set([
  'AT','BE','HR','CY','EE','FI','FR','DE','GR','IE',
  'IT','LV','LT','LU','MT','NL','PT','SK','SI','ES',
]);

function currencyForCountry(country: string): string {
  if (country === 'GE') return 'GEL';
  if (EUROZONE.has(country)) return 'EUR';
  return 'USD';
}

function isPrivateIp(ip: string): boolean {
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
  );
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  if (request.cookies.has('display-currency')) return response;

  const forwarded = request.headers.get('x-forwarded-for');
  const ip = (forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') ?? '').trim();

  if (!ip || isPrivateIp(ip)) {
    response.cookies.set('display-currency', 'USD', { maxAge: 86400, path: '/' });
    return response;
  }

  try {
    const geo = await fetch(`https://ipapi.co/${ip}/country/`, { next: { revalidate: 3600 } });
    const country = (await geo.text()).trim().toUpperCase();
    response.cookies.set('display-currency', currencyForCountry(country), { maxAge: 86400, path: '/' });
  } catch {
    response.cookies.set('display-currency', 'USD', { maxAge: 86400, path: '/' });
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon).*)'],
};
