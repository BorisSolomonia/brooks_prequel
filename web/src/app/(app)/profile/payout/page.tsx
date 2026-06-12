'use client';

import { useEffect, useState, FormEvent } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
        setError(err instanceof Error ? err.message : t('account.payout.errorLoad'));
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
      setSavedMessage(t('account.payout.savedMessage'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('account.payout.errorSave'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="px-4 py-6 text-sm text-ig-text-secondary">{t('account.payout.loading')}</div>;
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/profile" className="text-sm text-ig-text-secondary hover:text-ig-text-primary">{t('account.payout.backToProfile')}</Link>
      </div>
      <h1 className="mw-section-title text-2xl">{t('account.payout.title')}</h1>
      <p className="mt-2 text-sm text-ig-text-secondary">
        {t('account.payout.description')}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <label className="block">
          <span className="block text-sm font-semibold text-ig-text-secondary">{t('account.payout.fields.iban')}</span>
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
            {t('account.payout.fields.ibanHelp')}
          </span>
        </label>

        <label className="block">
          <span className="block text-sm font-semibold text-ig-text-secondary">{t('account.payout.fields.beneficiaryName')}</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('account.payout.fields.beneficiaryNamePlaceholder')}
            className="mt-1 block w-full rounded-md border-2 border-ig-border bg-ig-elevated px-3 py-2 text-base text-ig-text-primary placeholder:text-ig-text-tertiary focus:border-brand-500 focus:outline-none md:text-sm"
          />
        </label>

        <label className="block">
          <span className="block text-sm font-semibold text-ig-text-secondary">{t('account.payout.fields.currency')}</span>
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
          {saving ? t('account.payout.saving') : t('account.payout.saveButton')}
        </button>
      </form>
    </div>
  );
}
