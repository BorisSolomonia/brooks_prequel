'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAccessToken } from '@/hooks/useAccessToken';
import { useCurrency } from '@/hooks/useCurrency';
import type { PurchaseResponse, PageResponse } from '@/types';

export default function MyPurchasesPage() {
  const { token, loading: tokenLoading } = useAccessToken();
  const { formatAmount } = useCurrency();
  const [purchases, setPurchases] = useState<PurchaseResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    if (tokenLoading || !token) return;

    setLoading(true);
    api.get<PageResponse<PurchaseResponse>>(`/api/me/purchases?page=${page}&size=12`, token)
      .then((data) => {
        setPurchases(data.content);
        setTotalPages(data.totalPages);
      })
      .catch(() => setPurchases([]))
      .finally(() => setLoading(false));
  }, [token, tokenLoading, page]);

  if (tokenLoading || loading) {
    return <div className="max-w-4xl mx-auto px-4 py-12 text-center text-ig-text-tertiary">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-xl font-semibold text-ig-text-primary mb-6">My Purchases</h1>

      {purchases.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-ig-text-secondary mb-4">You haven&apos;t purchased any guides yet.</p>
          <Link
            href="/search"
            className="inline-flex min-h-11 items-center rounded-lg bg-ig-blue px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ig-blue-hover"
          >
            Explore Guides
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {purchases.map((purchase) => (
              <Link
                key={purchase.id}
                href={`/guides/${purchase.guideId}/view`}
                className="block bg-ig-elevated border border-ig-border rounded-xl overflow-hidden hover:border-ig-text-tertiary transition-colors"
              >
                {purchase.guideCoverImageUrl ? (
                  <div className="h-36 bg-ig-secondary">
                    <img src={purchase.guideCoverImageUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="h-36 bg-ig-secondary flex items-center justify-center">
                    <span className="text-ig-text-tertiary text-sm">No cover</span>
                  </div>
                )}
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-ig-text-primary truncate">
                    {purchase.guideTitle || 'Untitled Guide'}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-ig-text-tertiary">
                    {purchase.guideRegion && <span>{purchase.guideRegion}</span>}
                    <span>v{purchase.guideVersionNumber}</span>
                    <span>{formatAmount(purchase.priceCentsPaid)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="min-h-11 rounded-md border border-ig-border bg-ig-elevated px-4 py-2 text-sm text-ig-text-secondary disabled:opacity-50 lg:min-h-0 lg:px-3 lg:py-1.5"
              >
                Previous
              </button>
              <span className="inline-flex min-h-11 items-center px-3 py-1.5 text-sm text-ig-text-tertiary lg:min-h-0">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="min-h-11 rounded-md border border-ig-border bg-ig-elevated px-4 py-2 text-sm text-ig-text-secondary disabled:opacity-50 lg:min-h-0 lg:px-3 lg:py-1.5"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
