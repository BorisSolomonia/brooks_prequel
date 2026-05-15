'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { compliance } from '@/lib/compliance';
import Spinner from '@/components/ui/Spinner';

type State = 'idle' | 'loading' | 'deleted' | 'expired' | 'already_used' | 'invalid' | 'network_error';

export default function ConfirmDeletePage() {
  return (
    <Suspense fallback={<Loading />}>
      <ConfirmInner />
    </Suspense>
  );
}

function Loading() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl items-center justify-center px-4">
      <div className="flex items-center gap-3 text-ig-text-secondary">
        <Spinner />
        <span>Confirming deletion…</span>
      </div>
    </main>
  );
}

function ConfirmInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [state, setState] = useState<State>('idle');

  useEffect(() => {
    if (!token) {
      setState('invalid');
      return;
    }
    setState('loading');
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '';
    fetch(`${apiBase}/api/account/delete/confirm?token=${encodeURIComponent(token)}`, {
      method: 'GET',
    })
      .then(async (res) => {
        if (res.ok) {
          setState('deleted');
          return;
        }
        const body = (await res.json().catch(() => ({}))) as { status?: string };
        if (body.status === 'expired') setState('expired');
        else if (body.status === 'already_used') setState('already_used');
        else setState('invalid');
      })
      .catch(() => setState('network_error'));
  }, [token]);

  return (
    <main className="mx-auto min-h-dvh max-w-xl px-4 py-12 pb-24">
      <p className="mw-eyebrow">Account</p>
      <h1 className="mw-section-title mt-2 text-3xl">Confirm account deletion</h1>

      <div className="mt-6">{renderBody(state)}</div>

      <p className="mt-10 text-xs text-ig-text-tertiary">
        Questions? {compliance.email} · {compliance.supportResponseTime}
      </p>
    </main>
  );
}

function renderBody(state: State) {
  switch (state) {
    case 'idle':
    case 'loading':
      return (
        <div className="flex items-center gap-3 text-ig-text-secondary">
          <Spinner />
          <span>Confirming your deletion request…</span>
        </div>
      );

    case 'deleted':
      return (
        <div className="rounded-2xl border-2 border-ig-success/40 bg-ig-success/10 p-5 text-sm leading-6 text-ig-text-primary">
          <p className="text-base font-semibold">Account deleted</p>
          <p className="mt-2 text-ig-text-secondary">
            Your profile, purchases, and uploaded content have been removed from our active
            database. Backup copies are purged within 30 days. Records we are required to keep
            for tax and accounting law are retained anonymised.
          </p>
          <p className="mt-3 text-ig-text-secondary">You can close this tab.</p>
        </div>
      );

    case 'expired':
      return (
        <div className="rounded-2xl border-2 border-ig-error/40 bg-ig-error/10 p-5 text-sm leading-6 text-ig-text-primary">
          <p className="text-base font-semibold">Link expired</p>
          <p className="mt-2 text-ig-text-secondary">
            Deletion-confirmation links are valid for 48 hours. Please start a new request from{' '}
            <Link className="text-brand-500 underline" href="/account/delete">
              the deletion page
            </Link>
            .
          </p>
        </div>
      );

    case 'already_used':
      return (
        <div className="rounded-2xl border-2 border-ig-border bg-ig-elevated p-5 text-sm leading-6 text-ig-text-primary">
          <p className="text-base font-semibold">Link already used</p>
          <p className="mt-2 text-ig-text-secondary">
            This confirmation link has already been used. If you believe this was not you,
            contact {compliance.email} immediately.
          </p>
        </div>
      );

    case 'invalid':
      return (
        <div className="rounded-2xl border-2 border-ig-border bg-ig-elevated p-5 text-sm leading-6 text-ig-text-primary">
          <p className="text-base font-semibold">Invalid link</p>
          <p className="mt-2 text-ig-text-secondary">
            We could not find this confirmation token. It may have been mistyped. Start over at{' '}
            <Link className="text-brand-500 underline" href="/account/delete">
              brooksweb.uk/account/delete
            </Link>
            .
          </p>
        </div>
      );

    case 'network_error':
      return (
        <div className="rounded-2xl border-2 border-ig-error/40 bg-ig-error/10 p-5 text-sm leading-6 text-ig-text-primary">
          <p className="text-base font-semibold">Could not reach the server</p>
          <p className="mt-2 text-ig-text-secondary">
            Try again in a few minutes. If it keeps failing, write to {compliance.email}.
          </p>
        </div>
      );
  }
}
