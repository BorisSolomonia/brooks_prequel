'use client';

import { useCallback, useEffect, useState } from 'react';
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
      setError(err instanceof Error ? err.message : 'Failed to mark as paid');
    } finally {
      setMarking(false);
    }
  };

  if (loading) return <div className="text-[var(--text-secondary)]">Loading…</div>;
  if (!summary) return null;

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-xl font-semibold text-[var(--text-primary)]">Earnings</h1>
      <p className="text-sm text-[var(--text-tertiary)]">
        Totals below show amounts still <strong>PENDING</strong> payout. After you transfer a creator their share through your bank,
        click <strong>Mark as paid</strong> on that row and record the bank transaction reference for audit.
      </p>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending Gross', value: summary.totalGrossCents },
          { label: 'Pending Platform Revenue', value: summary.totalCommissionCents },
          { label: 'Creator Payouts Owed', value: summary.totalNetCents },
        ].map(({ label, value }) => (
          <div key={label} className="border border-[var(--border)] rounded-xl p-4 bg-[var(--bg-elevated)]">
            <p className="text-xs text-[var(--text-tertiary)] mb-1">{label}</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{formatCents(value)}</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">Per Creator</h2>
        {summary.byCreator.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)]">Nothing pending. All sales are paid out.</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-tertiary)]">
                <th className="py-2 pr-4">Creator</th>
                <th className="py-2 pr-4">Gross</th>
                <th className="py-2 pr-4">Commission</th>
                <th className="py-2 pr-4">Net (owed)</th>
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
                      Mark as paid
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
            <h3 className="font-display text-lg font-black text-ig-text-primary">Mark as paid</h3>
            <p className="mt-2 text-sm text-ig-text-secondary">
              This marks <strong>all pending earnings</strong> for creator <span className="font-mono text-xs">{payoutTarget.creatorId}</span> as PAID.
              The amount transferred should be <strong>{formatCents(payoutTarget.netCents)}</strong>.
            </p>
            <label className="mt-4 block">
              <span className="block text-sm font-semibold text-ig-text-secondary">Payment reference</span>
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Bank transaction ID, date, or any audit reference"
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
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmMarkPaid}
                disabled={marking}
                className="mw-button-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm disabled:opacity-50"
              >
                {marking && <Spinner />}
                {marking ? 'Saving…' : 'Confirm paid'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
