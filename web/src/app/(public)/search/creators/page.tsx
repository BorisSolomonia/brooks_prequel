'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { CreatorSearchResult, PageResponse } from '@/types';
import CreatorSearchCard from '@/components/search/CreatorSearchCard';
import SearchSkeleton from '@/components/search/SearchSkeleton';
import SearchFilterBar, { type SortOption } from '@/components/search/SearchFilterBar';
import Spinner from '@/components/ui/Spinner';
import Link from 'next/link';

function SearchCreatorsPageContent() {
  const { t } = useTranslation();

  const CREATOR_SORTS: SortOption[] = [
    { value: 'RELEVANCE', label: t('discovery.search.sortRelevance') },
    { value: 'TOP_RATED', label: t('discovery.search.sortTopRated') },
    { value: 'MOST_FOLLOWERS', label: t('discovery.search.sortMostFollowers') },
    { value: 'NEWEST', label: t('discovery.search.sortNewest') },
  ];

  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';
  const [results, setResults] = useState<CreatorSearchResult[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [sort, setSort] = useState('RELEVANCE');
  const [verified, setVerified] = useState(false);

  const buildUrl = useCallback((pageNum: number) => {
    const params = new URLSearchParams({ page: String(pageNum), size: '20' });
    if (q.trim()) params.set('q', q);
    if (minRating != null) params.set('minRating', String(minRating));
    if (verified) params.set('verified', 'true');
    if (sort && sort !== 'RELEVANCE') params.set('sort', sort);
    return `/api/search/creators?${params.toString()}`;
  }, [q, minRating, verified, sort]);

  const fetchPage = useCallback(async (pageNum: number, append: boolean) => {
    append ? setLoadingMore(true) : setLoading(true);
    setError(null);
    try {
      const data = await api.get<PageResponse<CreatorSearchResult>>(buildUrl(pageNum));
      setResults(prev => append ? [...prev, ...data.content] : data.content);
      setTotal(data.totalElements);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [buildUrl]);

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
      <h1 data-tour="creators-page" className="mw-section-title mb-1 text-xl">{t('discovery.search.creatorsTitle')}</h1>
      {total > 0 && (
        <p className="text-sm text-ig-text-secondary mb-6">
          {q.trim() ? t('discovery.search.totalResultsForQuery', { total, q }) : t('discovery.search.totalCreators', { count: total })}
        </p>
      )}

      {/* Rating + sort/date + verified (the universal filter bar) */}
      <SearchFilterBar
        minRating={minRating}
        onMinRating={setMinRating}
        sort={sort}
        onSort={setSort}
        sortOptions={CREATOR_SORTS}
        verified={verified}
        onVerified={setVerified}
      />

      {loading && <SearchSkeleton />}
      {error && <p className="mt-8 text-center text-ig-error">{error}</p>}

      {!loading && results.length === 0 && (
        <p className="text-ig-text-secondary text-center mt-16">{t('discovery.search.noCreatorsFound')}</p>
      )}

      <div className="space-y-3">
        {results.map((creator, idx) => (
          <div key={creator.userId} data-tour={idx === 0 ? 'first-creator-card' : undefined}>
            <CreatorSearchCard creator={creator} />
          </div>
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

export default function SearchCreatorsPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-4 py-8"><SearchSkeleton /></div>}>
      <SearchCreatorsPageContent />
    </Suspense>
  );
}
