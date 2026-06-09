'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState, useCallback } from 'react';
import type { CreatorSearchResult } from '@/types';
import { useInfinitePagination } from '@/hooks/useInfinitePagination';
import CreatorSearchCard from '@/components/search/CreatorSearchCard';
import SearchSkeleton from '@/components/search/SearchSkeleton';
import SearchFilterBar, { type SortOption } from '@/components/search/SearchFilterBar';
import Spinner from '@/components/ui/Spinner';
import Link from 'next/link';

const CREATOR_SORTS: SortOption[] = [
  { value: 'RELEVANCE', label: 'Relevance' },
  { value: 'TOP_RATED', label: 'Top rated' },
  { value: 'MOST_FOLLOWERS', label: 'Most followers' },
  { value: 'NEWEST', label: 'Newest' },
];

function SearchCreatorsPageContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';
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

  const { results, total, loading, loadingMore, error, loadMore } =
    useInfinitePagination<CreatorSearchResult>(buildUrl);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href={`/search?q=${encodeURIComponent(q)}`} className="mb-4 inline-block font-display text-sm font-black uppercase tracking-[0.06em] text-brand-500 hover:text-brand-400">
        &larr; Back to search
      </Link>
      <h1 data-tour="creators-page" className="mw-section-title mb-1 text-xl">Creators</h1>
      {total > 0 && (
        <p className="text-sm text-ig-text-secondary mb-6">
          {total} {q.trim() ? <>results for &ldquo;{q}&rdquo;</> : 'creators'}
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
        <p className="text-ig-text-secondary text-center mt-16">No creators found.</p>
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
          onClick={loadMore}
          disabled={loadingMore}
          className="mw-button-secondary mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 disabled:opacity-50"
        >
          {loadingMore && <Spinner />}
          {loadingMore ? 'Loading...' : 'Load more'}
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
