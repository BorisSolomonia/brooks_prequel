'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback } from 'react';
import type { PlaceSearchResult } from '@/types';
import { useInfinitePagination } from '@/hooks/useInfinitePagination';
import PlaceSearchCard from '@/components/search/PlaceSearchCard';
import SearchSkeleton from '@/components/search/SearchSkeleton';
import Spinner from '@/components/ui/Spinner';
import Link from 'next/link';

function SearchPlacesPageContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';

  const buildUrl = useCallback(
    (pageNum: number) => `/api/search/places?q=${encodeURIComponent(q)}&page=${pageNum}&size=20`,
    [q],
  );

  const { results, total, loading, loadingMore, error, loadMore } =
    useInfinitePagination<PlaceSearchResult>(buildUrl, Boolean(q.trim()));

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href={`/search?q=${encodeURIComponent(q)}`} className="mb-4 inline-block font-display text-sm font-black uppercase tracking-[0.06em] text-brand-500 hover:text-brand-400">
        &larr; Back to search
      </Link>
      <h1 className="mw-section-title mb-1 text-xl">Places</h1>
      {total > 0 && (
        <p className="text-sm text-ig-text-secondary mb-6">{total} results for &ldquo;{q}&rdquo;</p>
      )}

      {loading && <SearchSkeleton />}
      {error && <p className="mt-8 text-center text-ig-error">{error}</p>}

      {!loading && results.length === 0 && (
        <p className="text-ig-text-secondary text-center mt-16">No places found.</p>
      )}

      <div className="space-y-3">
        {results.map((place) => (
          <PlaceSearchCard key={place.id} place={place} />
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

export default function SearchPlacesPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-4 py-8"><SearchSkeleton /></div>}>
      <SearchPlacesPageContent />
    </Suspense>
  );
}
