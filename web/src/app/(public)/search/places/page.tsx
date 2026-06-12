'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { PlaceSearchResult, PageResponse } from '@/types';
import PlaceSearchCard from '@/components/search/PlaceSearchCard';
import SearchSkeleton from '@/components/search/SearchSkeleton';
import Spinner from '@/components/ui/Spinner';
import Link from 'next/link';

function SearchPlacesPageContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(async (pageNum: number, append: boolean) => {
    if (!q.trim()) return;
    append ? setLoadingMore(true) : setLoading(true);
    setError(null);
    try {
      const data = await api.get<PageResponse<PlaceSearchResult>>(
        `/api/search/places?q=${encodeURIComponent(q)}&page=${pageNum}&size=20`
      );
      setResults(prev => append ? [...prev, ...data.content] : data.content);
      setTotal(data.totalElements);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [q]);

  useEffect(() => {
    setResults([]);
    setPage(0);
    fetchPage(0, false);
  }, [fetchPage]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href={`/search?q=${encodeURIComponent(q)}`} className="mb-4 inline-block font-display text-sm font-black uppercase tracking-[0.06em] text-brand-500 hover:text-brand-400">
        {t('discovery.search.backToSearch')}
      </Link>
      <h1 className="mw-section-title mb-1 text-xl">{t('discovery.search.placesTitle')}</h1>
      {total > 0 && (
        <p className="text-sm text-ig-text-secondary mb-6">{t('discovery.search.totalResultsForQuery', { total, q })}</p>
      )}

      {loading && <SearchSkeleton />}
      {error && <p className="mt-8 text-center text-ig-error">{error}</p>}

      {!loading && results.length === 0 && (
        <p className="text-ig-text-secondary text-center mt-16">{t('discovery.search.noPlacesFound')}</p>
      )}

      <div className="space-y-3">
        {results.map((place) => (
          <PlaceSearchCard key={place.id} place={place} />
        ))}
      </div>

      {!loading && results.length < total && (
        <button
          onClick={() => fetchPage(page + 1, true)}
          disabled={loadingMore}
          className="mw-button-secondary mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 disabled:opacity-50"
        >
          {loadingMore && <Spinner />}
          {loadingMore ? t('discovery.search.loadingMore') : t('discovery.search.loadMore')}
        </button>
      )}
    </div>
  );
}

export default function SearchPlacesPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-4 py-8"><SearchSkeleton /></div>}>
      <SearchPlacesPageContent />
    </Suspense>
  );
}
