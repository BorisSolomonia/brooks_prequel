'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { compliance, formatMoney } from '@/lib/compliance';
import type { GuideSearchResult, PageResponse } from '@/types';

function productPrice(guide: GuideSearchResult) {
  const effective = guide.effectivePriceCents ?? guide.priceCents;
  return formatMoney(effective, guide.currency);
}

export default function PricingPage() {
  const [guides, setGuides] = useState<GuideSearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = async (nextPage: number, append: boolean) => {
    append ? setLoadingMore(true) : setLoading(true);
    setError(null);
    try {
      const data = await api.get<PageResponse<GuideSearchResult>>(`/api/search/guides/catalog?page=${nextPage}&size=50`);
      setGuides((current) => append ? [...current, ...data.content] : data.content);
      setTotal(data.totalElements);
      setPage(nextPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchPage(0, false);
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase text-brand-500">Products and prices</p>
        <h1 className="mt-2 text-3xl font-semibold text-ig-text-primary">Brooks guide catalog</h1>
        <p className="mt-3 text-sm leading-6 text-ig-text-secondary">
          All products sold on Brooks are digital travel guides. Prices are shown in the product currency before checkout, including active sale pricing where available.
        </p>
      </div>

      <div className="mt-6 rounded-lg border border-ig-border bg-ig-elevated p-5">
        <div className="grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-ig-text-tertiary">Service provider</p>
            <p className="mt-1 font-semibold text-ig-text-primary">{compliance.legalEntity}</p>
          </div>
          <div>
            <p className="text-ig-text-tertiary">Delivery</p>
            <p className="mt-1 font-semibold text-ig-text-primary">Digital access after payment</p>
          </div>
          <div>
            <p className="text-ig-text-tertiary">Support</p>
            <p className="mt-1 font-semibold text-ig-text-primary">{compliance.email}</p>
          </div>
        </div>
      </div>

      {loading && <p className="mt-10 text-sm text-ig-text-tertiary">Loading products...</p>}
      {error && <p className="mt-10 text-sm text-ig-error">{error}</p>}

      {!loading && guides.length === 0 && !error && (
        <div className="mt-10 rounded-lg border border-ig-border bg-ig-elevated p-5 text-sm text-ig-text-secondary">
          No published guide products are available yet.
        </div>
      )}

      {guides.length > 0 && (
        <div className="mt-8 overflow-hidden rounded-lg border border-ig-border bg-ig-elevated">
          <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-ig-border px-4 py-3 text-xs font-semibold uppercase text-ig-text-tertiary sm:grid-cols-[1fr_140px_140px]">
            <span>Product</span>
            <span className="text-right">Price</span>
            <span className="hidden text-right sm:block">Delivery</span>
          </div>
          {guides.map((guide) => (
            <Link
              key={guide.id}
              href={`/guides/${guide.id}/view`}
              className="grid grid-cols-[1fr_auto] gap-3 border-b border-ig-border px-4 py-4 transition-colors last:border-b-0 hover:bg-ig-hover sm:grid-cols-[1fr_140px_140px]"
            >
              <span>
                <span className="block font-semibold text-ig-text-primary">{guide.title}</span>
                <span className="mt-1 block text-sm text-ig-text-tertiary">
                  {guide.displayLocation || guide.primaryCity || guide.region || 'Travel guide'} · {guide.dayCount}-day guide · {guide.placeCount} places
                </span>
              </span>
              <span className="text-right font-semibold text-ig-text-primary">
                {productPrice(guide)}
                {guide.salePriceCents != null && guide.salePriceCents !== guide.priceCents && (
                  <span className="block text-xs font-normal text-ig-text-tertiary line-through">
                    {formatMoney(guide.priceCents, guide.currency)}
                  </span>
                )}
              </span>
              <span className="hidden text-right text-sm text-ig-text-secondary sm:block">Digital</span>
            </Link>
          ))}
        </div>
      )}

      {guides.length < total && (
        <button
          type="button"
          onClick={() => fetchPage(page + 1, true)}
          disabled={loadingMore}
          className="mt-6 min-h-11 rounded-md border border-ig-border bg-ig-elevated px-4 py-2 text-sm font-semibold text-ig-text-primary transition-colors hover:bg-ig-hover disabled:opacity-60"
        >
          {loadingMore ? 'Loading...' : 'Load more products'}
        </button>
      )}
    </div>
  );
}
