'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccessToken } from '@/hooks/useAccessToken';
import { api, API_BASE_URL } from '@/lib/api';
import { formatCents } from '@/lib/formatting';
import Spinner from '@/components/ui/Spinner';

interface AdminTransaction {
  purchaseId: string;
  saleTime: string | null;
  guideId: string;
  guideTitle: string | null;
  creatorId: string;
  creatorName: string | null;
  creatorUsername: string | null;
  buyerId: string;
  buyerName: string | null;
  buyerEmail: string | null;
  grossCents: number;
  commissionCents: number;
  netCents: number;
  currency: string | null;
  commissionRateBps: number | null;
  creatorIban: string | null;
  creatorBeneficiaryName: string | null;
  payoutCurrency: string | null;
  payoutStatus: string | null;
  paidAt: string | null;
  bogOrderId: string | null;
  externalOrderId: string | null;
  bogIpayPaymentId: string | null;
  bogTransactionId: string | null;
  status: string | null;
}

interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

const PAGE_SIZE = 20;

// date (yyyy-mm-dd) → ISO instant. `to` is end-of-day so the range is inclusive.
const toInstant = (date: string, endOfDay = false) =>
  date ? `${date}T${endOfDay ? '23:59:59' : '00:00:00'}Z` : '';

function buildQuery(from: string, to: string, creatorId: string, guideId: string, extra?: Record<string, string>) {
  const q = new URLSearchParams(extra);
  if (from) q.set('from', toInstant(from));
  if (to) q.set('to', toInstant(to, true));
  if (creatorId.trim()) q.set('creatorId', creatorId.trim());
  if (guideId.trim()) q.set('guideId', guideId.trim());
  return q.toString();
}

const fmtTime = (iso: string | null) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
};

export default function AdminTransactionsPage() {
  const { t } = useTranslation();
  const { token, loading: tokenLoading } = useAccessToken();
  const [data, setData] = useState<Page<AdminTransaction> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // filter inputs (applied) vs. draft (in the form)
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [creatorId, setCreatorId] = useState('');
  const [guideId, setGuideId] = useState('');
  const [page, setPage] = useState(0);

  const fetchPage = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    const qs = buildQuery(from, to, creatorId, guideId, { page: String(page), size: String(PAGE_SIZE) });
    api.get<Page<AdminTransaction>>(`/api/admin/transactions?${qs}`, token)
      .then((p) => setData(p))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load transactions'))
      .finally(() => setLoading(false));
  }, [token, from, to, creatorId, guideId, page]);

  useEffect(() => { fetchPage(); }, [fetchPage]);

  const applyFilters = () => { setPage(0); /* fetch runs via effect when page/filters change */ };

  const exportCsv = async () => {
    if (!token) return;
    setExporting(true);
    try {
      const qs = buildQuery(from, to, creatorId, guideId);
      const res = await fetch(`${API_BASE_URL}/api/admin/transactions/export.csv?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = `brooks-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  if (tokenLoading) return <div className="px-4 py-12 text-center text-ig-text-tertiary">{t('creatorTools.admin.loading')}</div>;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ig-text-primary">{t('creatorTools.admin.transactionsTitle')}</h1>
        <button
          onClick={exportCsv}
          disabled={exporting}
          className="rounded-md bg-ig-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {exporting ? t('creatorTools.admin.exporting') : t('creatorTools.admin.exportCsv')}
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-ig-border bg-ig-secondary p-3">
        <label className="flex flex-col text-xs text-ig-text-secondary">{t('creatorTools.admin.labelFrom')}
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="mt-1 rounded-md border border-ig-border bg-ig-primary px-2 py-1.5 text-sm text-ig-text-primary" />
        </label>
        <label className="flex flex-col text-xs text-ig-text-secondary">{t('creatorTools.admin.labelTo')}
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="mt-1 rounded-md border border-ig-border bg-ig-primary px-2 py-1.5 text-sm text-ig-text-primary" />
        </label>
        <label className="flex flex-col text-xs text-ig-text-secondary">{t('creatorTools.admin.labelCreatorId')}
          <input type="text" value={creatorId} onChange={(e) => setCreatorId(e.target.value)} placeholder="uuid"
            className="mt-1 w-64 rounded-md border border-ig-border bg-ig-primary px-2 py-1.5 text-sm text-ig-text-primary" />
        </label>
        <label className="flex flex-col text-xs text-ig-text-secondary">{t('creatorTools.admin.labelGuideId')}
          <input type="text" value={guideId} onChange={(e) => setGuideId(e.target.value)} placeholder="uuid"
            className="mt-1 w-64 rounded-md border border-ig-border bg-ig-primary px-2 py-1.5 text-sm text-ig-text-primary" />
        </label>
        <button onClick={applyFilters} className="rounded-md border border-ig-border px-3 py-2 text-sm font-semibold text-ig-text-secondary hover:border-ig-blue hover:text-ig-blue">
          {t('creatorTools.admin.apply')}
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

      {loading ? (
        <div className="py-12 text-center"><Spinner /></div>
      ) : !data || data.content.length === 0 ? (
        <p className="py-12 text-center text-ig-text-tertiary">{t('creatorTools.admin.noTransactions')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-ig-border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-ig-secondary text-xs uppercase text-ig-text-tertiary">
              <tr>
                <th className="px-3 py-2">{t('creatorTools.admin.thSaleTime')}</th>
                <th className="px-3 py-2">{t('creatorTools.admin.thGuide')}</th>
                <th className="px-3 py-2">{t('creatorTools.admin.thCreator')}</th>
                <th className="px-3 py-2">{t('creatorTools.admin.thBuyer')}</th>
                <th className="px-3 py-2 text-right">{t('creatorTools.admin.thGross')}</th>
                <th className="px-3 py-2 text-right">{t('creatorTools.admin.thCommission')}</th>
                <th className="px-3 py-2 text-right">{t('creatorTools.admin.thNet')}</th>
                <th className="px-3 py-2">{t('creatorTools.admin.thPayout')}</th>
                <th className="px-3 py-2">{t('creatorTools.admin.thCreatorIban')}</th>
                <th className="px-3 py-2">{t('creatorTools.admin.thBogRefs')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ig-border text-ig-text-primary">
              {data.content.map((t) => (
                <tr key={t.purchaseId} className="align-top">
                  <td className="whitespace-nowrap px-3 py-2 text-xs">{fmtTime(t.saleTime)}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{t.guideTitle ?? '—'}</div>
                    <div className="text-[10px] text-ig-text-tertiary">{t.guideId}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div>{t.creatorName ?? '—'}</div>
                    <div className="text-[10px] text-ig-text-tertiary">@{t.creatorUsername ?? '—'}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div>{t.buyerName ?? '—'}</div>
                    <div className="text-[10px] text-ig-text-tertiary">{t.buyerEmail ?? '—'}</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">{formatCents(t.grossCents)} {t.currency ?? ''}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">{formatCents(t.commissionCents)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-semibold">{formatCents(t.netCents)} {t.currency ?? ''}</td>
                  <td className="px-3 py-2 text-xs">
                    <div>{t.payoutStatus ?? '—'}</div>
                    {t.paidAt && <div className="text-[10px] text-ig-text-tertiary">{fmtTime(t.paidAt)}</div>}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <div className="font-mono">{t.creatorIban ?? '—'}</div>
                    <div className="text-[10px] text-ig-text-tertiary">{t.creatorBeneficiaryName ?? ''}</div>
                  </td>
                  <td className="px-3 py-2 text-[10px] text-ig-text-tertiary">
                    <div>ord: {t.bogOrderId ?? '—'}</div>
                    <div>ext: {t.externalOrderId ?? '—'}</div>
                    <div>txn: {t.bogTransactionId ?? '—'}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-ig-text-secondary">
          <span>{t('creatorTools.admin.paginationInfo', { total: data.totalElements, page: data.page + 1, totalPages: data.totalPages })}</span>
          <div className="flex gap-2">
            <button disabled={data.page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="rounded-md border border-ig-border px-3 py-1.5 disabled:opacity-40">{t('creatorTools.admin.prev')}</button>
            <button disabled={data.last} onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-ig-border px-3 py-1.5 disabled:opacity-40">{t('creatorTools.admin.next')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
