'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl items-center justify-center px-4">
      <div className="flex items-center gap-3 text-ig-text-secondary">
        <Spinner />
        <span>{t('account.deleteConfirm.confirmingDeletion')}</span>
      </div>
    </main>
  );
}

function ConfirmInner() {
  const { t } = useTranslation();
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
      <p className="mw-eyebrow">{t('account.deleteConfirm.eyebrow')}</p>
      <h1 className="mw-section-title mt-2 text-3xl">{t('account.deleteConfirm.title')}</h1>

      <div className="mt-6">{renderBody(state, t)}</div>

      <p className="mt-10 text-xs text-ig-text-tertiary">
        {t('account.deleteConfirm.questionsFooter', { email: compliance.email, responseTime: compliance.supportResponseTime })}
      </p>
    </main>
  );
}

function renderBody(state: State, t: (key: string, opts?: Record<string, unknown>) => string) {
  switch (state) {
    case 'idle':
    case 'loading':
      return (
        <div className="flex items-center gap-3 text-ig-text-secondary">
          <Spinner />
          <span>{t('account.deleteConfirm.confirmingDeletion')}</span>
        </div>
      );

    case 'deleted':
      return (
        <div className="rounded-2xl border-2 border-ig-success/40 bg-ig-success/10 p-5 text-sm leading-6 text-ig-text-primary">
          <p className="text-base font-semibold">{t('account.deleteConfirm.deletedTitle')}</p>
          {/* LEGAL EXCEPTION: deletion confirmation detail prose left hardcoded */}
          <p className="mt-2 text-ig-text-secondary">
            Your profile, purchases, and uploaded content have been removed from our active
            database. Backup copies are purged within 30 days. Records we are required to keep
            for tax and accounting law are retained anonymised.
          </p>
          <p className="mt-3 text-ig-text-secondary">{t('account.deleteConfirm.canCloseTab')}</p>
        </div>
      );

    case 'expired':
      return (
        <div className="rounded-2xl border-2 border-ig-error/40 bg-ig-error/10 p-5 text-sm leading-6 text-ig-text-primary">
          <p className="text-base font-semibold">{t('account.deleteConfirm.expiredTitle')}</p>
          <p className="mt-2 text-ig-text-secondary">
            {/* LEGAL EXCEPTION: time period prose left hardcoded */}
            Deletion-confirmation links are valid for 48 hours. Please start a new request from{' '}
            <Link className="text-brand-500 underline" href="/account/delete">
              {t('account.deleteConfirm.deletionPageLink')}
            </Link>
            .
          </p>
        </div>
      );

    case 'already_used':
      return (
        <div className="rounded-2xl border-2 border-ig-border bg-ig-elevated p-5 text-sm leading-6 text-ig-text-primary">
          <p className="text-base font-semibold">{t('account.deleteConfirm.alreadyUsedTitle')}</p>
          <p className="mt-2 text-ig-text-secondary">
            {t('account.deleteConfirm.alreadyUsedBody', { email: compliance.email })}
          </p>
        </div>
      );

    case 'invalid':
      return (
        <div className="rounded-2xl border-2 border-ig-border bg-ig-elevated p-5 text-sm leading-6 text-ig-text-primary">
          <p className="text-base font-semibold">{t('account.deleteConfirm.invalidTitle')}</p>
          <p className="mt-2 text-ig-text-secondary">
            {/* LEGAL EXCEPTION: URL left hardcoded */}
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
          <p className="text-base font-semibold">{t('account.deleteConfirm.networkErrorTitle')}</p>
          <p className="mt-2 text-ig-text-secondary">
            {t('account.deleteConfirm.networkErrorBody', { email: compliance.email })}
          </p>
        </div>
      );
  }
}
