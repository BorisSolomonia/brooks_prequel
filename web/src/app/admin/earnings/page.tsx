'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { useAccessToken } from '@/hooks/useAccessToken';
import { api } from '@/lib/api';
import { formatCents } from '@/lib/formatting';
import Spinner from '@/components/ui/Spinner';

interface CreatorEarningsSummary {
  creatorId: string;
  grossCents: number;
  commissionCents: number;
  netCents: number;
}

interface EarningsSummary {
  totalGrossCents: number;
  totalCommissionCents: number;
  totalNetCents: number;
  byCreator: CreatorEarningsSummary[];
}

export default function EarningsPage() {
  const { t } = useTranslation();
  const { token } = useAccessToken();
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [payoutTarget, setPayoutTarget] = useState<CreatorEarningsSummary | null>(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(() => {
    if (!token) return;
    api.get<EarningsSummary>('/api/admin/commission/earnings', token).then((s) => {
      setSummary(s);
      setLoading(false);
    });
  }, [token]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const openPayoutDialog = (creator: CreatorEarningsSummary) => {
    setPayoutTarget(creator);
    setPaymentReference('');
    setError(null);
  };

  const closePayoutDialog = () => {
    setPayoutTarget(null);
    setPaymentReference('');
    setError(null);
  };

  const confirmMarkPaid = async () => {
    if (!payoutTarget || !token) return;
    setMarking(true);
    setError(null);
    try {
      await api.post(
        `/api/admin/commission/payouts/${payoutTarget.creatorId}/mark-paid`,
        { paymentReference: paymentReference.trim() || null },
        token,
      );
      closePayoutDialog();
      fetchSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('creatorTools.admin.errorMarkPaid'));
    } finally {
      setMarking(false);
    }
  };

  if (loading) return <div className="text-[var(--text-secondary)]">{t('creatorTools.admin.loading')}</div>;
  if (!summary) return null;

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-xl font-semibold text-[var(--text-primary)]">{t('creatorTools.admin.earningsTitle')}</h1>
      <p className="text-sm text-[var(--text-tertiary)]">
        <Trans i18nKey="creatorTools.admin.earningsDesc" components={{ strong: <strong /> }} />
      </p>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: t('creatorTools.admin.pendingGross'), value: summary.totalGrossCents },
          { label: t('creatorTools.admin.pendingPlatformRevenue'), value: summary.totalCommissionCents },
          { label: t('creatorTools.admin.creatorPayoutsOwed'), value: summary.totalNetCents },
        ].map(({ label, value }) => (
          <div key={label} className="border border-[var(--border)] rounded-xl p-4 bg-[var(--bg-elevated)]">
            <p className="text-xs text-[var(--text-tertiary)] mb-1">{label}</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{formatCents(value)}</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">{t('creatorTools.admin.sectionPerCreator')}</h2>
        {summary.byCreator.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)]">{t('creatorTools.admin.noPendingEarnings')}</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-tertiary)]">
                <th className="py-2 pr-4">{t('creatorTools.admin.thCreator')}</th>
                <th className="py-2 pr-4">{t('creatorTools.admin.thGross')}</th>
                <th className="py-2 pr-4">{t('creatorTools.admin.thCommission')}</th>
                <th className="py-2 pr-4">{t('creatorTools.admin.thNetOwed')}</th>
                <th className="py-2 w-32" />
              </tr>
            </thead>
            <tbody>
              {summary.byCreator.map((c) => (
                <tr key={c.creatorId} className="border-b border-[var(--border-light)]">
                  <td className="py-2 pr-4 text-[var(--text-secondary)] text-xs font-mono">{c.creatorId}</td>
                  <td className="py-2 pr-4 text-[var(--text-primary)]">{formatCents(c.grossCents)}</td>
                  <td className="py-2 pr-4 text-[var(--text-primary)]">{formatCents(c.commissionCents)}</td>
                  <td className="py-2 pr-4 font-medium text-[var(--text-primary)]">{formatCents(c.netCents)}</td>
                  <td className="py-2">
                    <button
                      type="button"
                      onClick={() => openPayoutDialog(c)}
                      className="mw-button-secondary min-h-9 rounded-md px-3 py-1.5 text-xs"
                    >
                      {t('creatorTools.admin.markAsPaid')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {payoutTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border-2 border-ig-border bg-ig-elevated p-5 shadow-2xl">
            <h3 className="font-display text-lg font-black text-ig-text-primary">{t('creatorTools.admin.markAsPaid')}</h3>
            <p className="mt-2 text-sm text-ig-text-secondary">
              <Trans
                i18nKey="creatorTools.admin.markPaidDesc"
                values={{ creatorId: payoutTarget.creatorId, amount: formatCents(payoutTarget.netCents) }}
                components={{ strong: <strong />, code: <span className="font-mono text-xs" /> }}
              />
            </p>
            <label className="mt-4 block">
              <span className="block text-sm font-semibold text-ig-text-secondary">{t('creatorTools.admin.labelPaymentRef')}</span>
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder={t('creatorTools.admin.placeholderPaymentRef')}
                className="mt-1 block w-full rounded-md border-2 border-ig-border bg-ig-primary px-3 py-2 text-base text-ig-text-primary placeholder:text-ig-text-tertiary focus:border-brand-500 focus:outline-none md:text-sm"
              />
            </label>
            {error && <p className="mt-2 text-sm text-ig-error">{error}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={closePayoutDialog}
                disabled={marking}
                className="min-h-11 rounded-md border border-ig-border px-4 py-2 text-sm font-semibold text-ig-text-secondary hover:bg-ig-hover disabled:opacity-50"
              >
                {t('creatorTools.admin.cancel')}
              </button>
              <button
                type="button"
                onClick={confirmMarkPaid}
                disabled={marking}
                className="mw-button-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm disabled:opacity-50"
              >
                {marking && <Spinner />}
                {marking ? t('creatorTools.admin.saving') : t('creatorTools.admin.confirmPaid')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
