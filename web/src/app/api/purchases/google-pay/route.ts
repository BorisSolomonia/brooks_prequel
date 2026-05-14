import { NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

// Forwards a Google Pay tokenised payment to the Spring backend. Spring is
// responsible for: validating the bearer token (Auth0), decoding/forwarding
// the payment token to BOG iPay, creating the purchase + trip rows on success,
// and returning the trip id.
//
// Contract (request -> Spring):
//   POST {API_BASE_URL}/api/purchases/google-pay
//   Headers: Authorization: Bearer <auth0 token>
//   Body: { guideId: string, paymentToken: string, acceptedTerms: true }
//   Response: { tripId: string } on success, { error: string } on failure
//
// If the Spring endpoint is not yet implemented, the client falls back to the
// existing iPay hosted checkout via the regular Buy button.

export async function POST(request: Request) {
  const authz = request.headers.get('authorization') || '';
  if (!authz.toLowerCase().startsWith('bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const upstream = await fetch(`${API_BASE_URL}/api/purchases/google-pay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authz,
    },
    body: JSON.stringify(body),
  });

  const text = await upstream.text();
  const json = text ? safeJson(text) : {};
  return NextResponse.json(json, { status: upstream.status });
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}
