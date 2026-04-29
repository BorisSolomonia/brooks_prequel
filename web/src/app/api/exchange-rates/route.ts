import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const currency = searchParams.get('currency') ?? 'USD';

  if (currency === 'USD') {
    return NextResponse.json({ rate: 1, currency: 'USD' });
  }

  try {
    const res = await fetch(
      `https://api.frankfurter.app/latest?from=USD&to=${currency}`,
      { next: { revalidate: 86400 } },
    );
    const data = await res.json() as { rates?: Record<string, number> };
    const rate = data.rates?.[currency] ?? 1;
    return NextResponse.json({ rate, currency });
  } catch {
    return NextResponse.json({ rate: 1, currency: 'USD' });
  }
}
