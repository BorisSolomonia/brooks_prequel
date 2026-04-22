'use client';

export const dynamic = 'force-dynamic';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { PlaceSearchResult, PageResponse } from '@/types';
import PlaceSearchCard from '@/components/search/PlaceSearchCard';
import SearchSkeleton from '@/components/search/SearchSkeleton';
import Link from 'next/link';

function SearchPlacesPageContent() {
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
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link href={`/search?q=${encodeURIComponent(q)}`} className="text-sm text-ig-action-blue hover:underline mb-4 inline-block">
        &larr; Back to search
      </Link>
      <h1 className="text-xl font-bold text-ig-text-primary mb-1">Places</h1>
      {total > 0 && (
        <p className="text-sm text-ig-text-secondary mb-6">{total} results for &ldquo;{q}&rdquo;</p>
      )}

      {loading && <SearchSkeleton />}
      {error && <p className="text-red-400 text-center mt-8">{error}</p>}

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
          onClick={() => fetchPage(page + 1, true)}
          disabled={loadingMore}
          className="mt-6 w-full py-3 rounded-xl bg-ig-elevated text-ig-text-primary font-semibold hover:bg-ig-border transition-colors disabled:opacity-50"
        >
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
