'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { compliance } from '@/lib/compliance';
import { useAccessToken } from '@/hooks/useAccessToken';
import Spinner from '@/components/ui/Spinner';

const CONFIRM_PHRASE = 'delete my account';

export default function DeleteAccountPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { token } = useAccessToken();
  const [phrase, setPhrase] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const phraseOk = phrase.trim().toLowerCase() === CONFIRM_PHRASE;

  const handleSubmit = async () => {
    if (!phraseOk) return;
    if (!token) {
      setError(t('account.deleteInApp.errorNotSignedIn'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post('/api/account/delete', { reason }, token);
      setDone(true);
      setTimeout(() => router.push('/api/auth/logout'), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('account.deleteInApp.errorCouldNotDelete');
      setError(msg);
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="mw-section-title text-3xl">{t('account.deleteInApp.doneTitle')}</h1>
        <p className="mt-4 text-ig-text-secondary">
          {/* LEGAL EXCEPTION: long deletion confirmation prose left hardcoded */}
          Your account is now scheduled for deletion. You will be signed out
          shortly. Profile, purchases, and uploaded content are removed from our
          active database immediately; backup copies are purged within 30 days.
          A confirmation email is on its way to your registered address.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <p className="mw-eyebrow">{t('account.deleteInApp.eyebrow')}</p>
      <h1 className="mw-section-title mt-2 text-3xl">{t('account.deleteInApp.title')}</h1>

      <div className="mt-6 space-y-4 rounded-lg border border-ig-border bg-ig-elevated p-5 text-sm leading-6 text-ig-text-secondary">
        <p>
          Deleting your account is <strong>permanent</strong>. The following data
          is removed from our active database immediately and from backups
          within 30 days:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Profile, avatar, bio, and account credentials</li>
          <li>Guides, days, blocks, places, photos, and reviews you authored</li>
          <li>Purchased trip data and visit progress</li>
          <li>Stored OAuth refresh tokens (e.g. Google Calendar)</li>
        </ul>
        <p>
          Records we keep for legal reasons: purchase invoices required by tax
          and accounting law (kept anonymised), and server logs (purged within
          90 days). See the{' '}
          <Link href="/privacy" className="text-brand-500 underline hover:text-brand-400">
            Privacy Policy
          </Link>{' '}
          for full detail.
        </p>
        <p>
          If you only want to disconnect Google Calendar, do it from the
          add-to-calendar dialog instead — that keeps your account intact.
        </p>
      </div>

      <div className="mt-6 space-y-4">
        <label className="block text-sm">
          <span className="block font-medium text-ig-text-primary">
            {t('account.deleteInApp.reasonLabel')}
          </span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-ig-border bg-ig-primary p-3 text-sm text-ig-text-primary"
            placeholder={t('account.deleteInApp.reasonPlaceholder')}
          />
        </label>

        <label className="block text-sm">
          <span className="block font-medium text-ig-text-primary">
            {t('account.deleteInApp.confirmLabel')} <code>{CONFIRM_PHRASE}</code>
          </span>
          <input
            type="text"
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            className="mt-1 w-full rounded-lg border border-ig-border bg-ig-primary p-3 text-sm text-ig-text-primary"
          />
        </label>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={!phraseOk || loading}
          className="mw-button-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-6 py-2.5 text-sm disabled:opacity-50"
        >
          {loading && <Spinner />}
          {t('account.deleteInApp.deleteButton')}
        </button>

        <p className="text-xs text-ig-text-tertiary">
          {t('account.deleteInApp.questionsFooter', { email: compliance.email, responseTime: compliance.supportResponseTime })}
        </p>
      </div>
    </div>
  );
}
