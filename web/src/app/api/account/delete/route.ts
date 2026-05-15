import { NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

// Authenticated, in-app account deletion. Invoked from
// /(app)/settings/account/delete after the user types the confirmation phrase.
// Spring is responsible for: validating the Auth0 bearer token, soft-deleting
// the user row (or anonymising), revoking OAuth refresh tokens (Google
// Calendar etc.), and queueing the 30-day hard-delete from backups.
//
// We deliberately surface upstream status codes back to the client so the UI
// can show a meaningful error if Spring is down (rather than always green).

export async function POST(request: Request) {
  const authz = request.headers.get('authorization') || '';
  if (!authz.toLowerCase().startsWith('bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // Body is optional (only the reason field) — empty body is acceptable.
  }

  const upstream = await fetch(`${API_BASE_URL}/api/account/delete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authz,
    },
    body: JSON.stringify(body),
  });

  const text = await upstream.text();
  const json = text ? safeJson(text) : { ok: true };
  return NextResponse.json(json, { status: upstream.status });
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}
