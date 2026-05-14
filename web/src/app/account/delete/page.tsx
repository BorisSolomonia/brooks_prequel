'use client';

import { useState } from 'react';
import Link from 'next/link';
import { compliance } from '@/lib/compliance';
import Spinner from '@/components/ui/Spinner';

// Play Console requires a publicly reachable account-deletion URL — no login
// needed, since locked-out users must still be able to delete. Submitting here
// emails a confirmation link to the address on file; clicking that link is what
// actually triggers deletion. Authenticated users are routed to the in-app
// flow at /settings/account/delete instead.

export default function PublicAccountDeletePage() {
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/account/delete-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), reason }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="mw-section-title text-3xl">Check your email</h1>
        <p className="mt-4 text-ig-text-secondary">
          If an account exists for <strong>{email}</strong>, we have sent a
          confirmation link. Click it within 48 hours to permanently delete the
          account. If no email arrives, please contact {compliance.email}.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <p className="mw-eyebrow">Account</p>
      <h1 className="mw-section-title mt-2 text-3xl">Delete your Brooks account</h1>

      <div className="mt-6 space-y-4 text-sm leading-6 text-ig-text-secondary">
        <p>
          Use this page if you cannot sign in or have lost access to your
          account. Already signed in? Use{' '}
          <Link href="/settings/account/delete" className="text-brand-500 underline">
            in-app account deletion
          </Link>{' '}
          instead — it is immediate.
        </p>

        <p>
          Submitting this form emails a confirmation link to the address on
          file. Clicking that link permanently removes your profile, purchases,
          uploaded content, and OAuth tokens. Backup copies are purged within
          30 days. Purchase invoices required by tax law are retained
          anonymised. Full detail in the{' '}
          <Link href="/privacy" className="text-brand-500 underline">Privacy Policy</Link>.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block text-sm">
          <span className="block font-medium text-ig-text-primary">
            Email address on your Brooks account
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-ig-border bg-ig-primary p-3 text-sm text-ig-text-primary"
            placeholder="you@example.com"
          />
        </label>

        <label className="block text-sm">
          <span className="block font-medium text-ig-text-primary">
            Reason (optional)
          </span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-ig-border bg-ig-primary p-3 text-sm text-ig-text-primary"
          />
        </label>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading || !email}
          className="mw-button-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-6 py-2.5 text-sm disabled:opacity-50"
        >
          {loading && <Spinner />}
          Email me a deletion link
        </button>

        <p className="text-xs text-ig-text-tertiary">
          Need help? {compliance.email} · {compliance.supportResponseTime}
        </p>
      </form>
    </div>
  );
}
