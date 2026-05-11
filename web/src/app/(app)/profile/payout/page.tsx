'use client';

import { useEffect, useState, FormEvent } from 'react';
import Link from 'next/link';
import { useAccessToken } from '@/hooks/useAccessToken';
import { api } from '@/lib/api';
import Spinner from '@/components/ui/Spinner';

interface PayoutDetails {
  payoutIban: string | null;
  payoutBeneficiaryName: string | null;
  payoutCurrency: string | null;
}

const CURRENCIES = ['GEL', 'USD', 'EUR', 'GBP'];

export default function PayoutDetailsPage() {
  const { token, loading: tokenLoading } = useAccessToken();
  const [iban, setIban] = useState('');
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('GEL');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (tokenLoading || !token) return;
    let cancelled = false;
    api.get<PayoutDetails>('/api/me/payout', token)
      .then((data) => {
        if (cancelled) return;
        setIban(data.payoutIban ?? '');
        setName(data.payoutBeneficiaryName ?? '');
        setCurrency(data.payoutCurrency ?? 'GEL');
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load payout details');
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [token, tokenLoading]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);
    setSavedMessage(null);
    try {
      const updated = await api.put<PayoutDetails>(
        '/api/me/payout',
        {
          payoutIban: iban.trim().replace(/\s+/g, '').toUpperCase(),
          payoutBeneficiaryName: name.trim(),
          payoutCurrency: currency.toUpperCase(),
        },
        token,
      );
      setIban(updated.payoutIban ?? '');
      setName(updated.payoutBeneficiaryName ?? '');
      setCurrency(updated.payoutCurrency ?? 'GEL');
      setSavedMessage('Saved. The admin will use these details when transferring your share.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save payout details');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="px-4 py-6 text-sm text-ig-text-secondary">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/profile" className="text-sm text-ig-text-secondary hover:text-ig-text-primary">← Back to Profile</Link>
      </div>
      <h1 className="mw-section-title text-2xl">Payout details</h1>
      <p className="mt-2 text-sm text-ig-text-secondary">
        Provide your bank details so the platform can send you your share of guide sales.
        Brooks takes a platform fee on each sale; the remainder is owed to you and listed on
        the Admin earnings page until it is paid out.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <label className="block">
          <span className="block text-sm font-semibold text-ig-text-secondary">IBAN</span>
          <input
            type="text"
            value={iban}
            onChange={(e) => setIban(e.target.value)}
            placeholder="GE29NB0000000101904917"
            spellCheck={false}
            autoComplete="off"
            className="mt-1 block w-full rounded-md border-2 border-ig-border bg-ig-elevated px-3 py-2 font-mono text-base text-ig-text-primary placeholder:text-ig-text-tertiary focus:border-brand-500 focus:outline-none md:text-sm"
          />
          <span className="mt-1 block text-xs text-ig-text-tertiary">
            Up to 34 characters, starts with your country code (e.g., GE, GB, DE).
          </span>
        </label>

        <label className="block">
          <span className="block text-sm font-semibold text-ig-text-secondary">Beneficiary name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full legal name as on the bank account"
            className="mt-1 block w-full rounded-md border-2 border-ig-border bg-ig-elevated px-3 py-2 text-base text-ig-text-primary placeholder:text-ig-text-tertiary focus:border-brand-500 focus:outline-none md:text-sm"
          />
        </label>

        <label className="block">
          <span className="block text-sm font-semibold text-ig-text-secondary">Currency</span>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="mt-1 block w-full rounded-md border-2 border-ig-border bg-ig-elevated px-3 py-2 text-base text-ig-text-primary focus:border-brand-500 focus:outline-none md:text-sm"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        {error && <p className="text-sm text-ig-error">{error}</p>}
        {savedMessage && <p className="text-sm text-green-500">{savedMessage}</p>}

        <button
          type="submit"
          disabled={saving}
          className="mw-button-primary inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md py-3 text-sm disabled:opacity-60"
        >
          {saving && <Spinner />}
          {saving ? 'Saving…' : 'Save payout details'}
        </button>
      </form>
    </div>
  );
}
