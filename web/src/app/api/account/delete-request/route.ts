import { NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

// Public, unauthenticated entry point invoked from /account/delete. Forwards to
// the Spring backend, which is responsible for issuing the confirmation email
// and recording the deletion request. We always return 200 to avoid leaking
// whether the email exists (account enumeration defence).

export async function POST(request: Request) {
  let payload: { email?: unknown; reason?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  const reason = typeof payload.reason === 'string' ? payload.reason.slice(0, 1000) : '';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: true });
  }

  try {
    await fetch(`${API_BASE_URL}/api/account/delete-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, reason }),
    });
  } catch {
    // Swallow upstream failures: never reveal account existence.
  }

  return NextResponse.json({ ok: true });
}
