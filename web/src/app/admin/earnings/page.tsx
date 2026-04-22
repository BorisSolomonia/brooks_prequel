'use client';

import { useEffect, useState } from 'react';
import { useAccessToken } from '@/hooks/useAccessToken';
import { api } from '@/lib/api';
import { formatCents } from '@/lib/formatting';

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

  useEffect(() => {
    if (!token) return;
    api.get<EarningsSummary>('/api/admin/commission/earnings', token).then((s) => {
      setSummary(s);
      setLoading(false);
    });
  }, [token]);

  if (loading) return <div className="text-[var(--text-secondary)]">Loading…</div>;
  if (!summary) return null;

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-xl font-semibold text-[var(--text-primary)]">Earnings</h1>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Gross', value: summary.totalGrossCents },
          { label: 'Platform Revenue', value: summary.totalCommissionCents },
          { label: 'Creator Payouts Owed', value: summary.totalNetCents },
        ].map(({ label, value }) => (
          <div key={label} className="border border-[var(--border)] rounded-xl p-4 bg-[var(--bg-elevated)]">
            <p className="text-xs text-[var(--text-tertiary)] mb-1">{label}</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{formatCents(value)}</p>
          </div>
        ))}
      </div>

      {/* Per creator */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">Per Creator</h2>
        {summary.byCreator.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)]">No purchase data yet.</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-tertiary)]">
                <th className="py-2 pr-4">Creator</th>
                <th className="py-2 pr-4">Gross</th>
                <th className="py-2 pr-4">Commission</th>
                <th className="py-2">Net (owed)</th>
              </tr>
            </thead>
            <tbody>
              {summary.byCreator.map((c) => (
                <tr key={c.creatorId} className="border-b border-[var(--border-light)]">
                  <td className="py-2 pr-4 text-[var(--text-secondary)] text-xs font-mono">{c.creatorId}</td>
                  <td className="py-2 pr-4 text-[var(--text-primary)]">{formatCents(c.grossCents)}</td>
                  <td className="py-2 pr-4 text-[var(--text-primary)]">{formatCents(c.commissionCents)}</td>
                  <td className="py-2 font-medium text-[var(--text-primary)]">{formatCents(c.netCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
