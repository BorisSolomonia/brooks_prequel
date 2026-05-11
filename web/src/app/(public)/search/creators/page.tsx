'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { CreatorSearchResult, PageResponse } from '@/types';
import CreatorSearchCard from '@/components/search/CreatorSearchCard';
import SearchSkeleton from '@/components/search/SearchSkeleton';
import Spinner from '@/components/ui/Spinner';
import Link from 'next/link';

function SearchCreatorsPageContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';
  const [results, setResults] = useState<CreatorSearchResult[]>([]);
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
      const data = await api.get<PageResponse<CreatorSearchResult>>(
        `/api/search/creators?q=${encodeURIComponent(q)}&page=${pageNum}&size=20`
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
        &larr; Back to search
      </Link>
      <h1 data-tour="creators-page" className="mw-section-title mb-1 text-xl">Creators</h1>
      {total > 0 && (
        <p className="text-sm text-ig-text-secondary mb-6">{total} results for &ldquo;{q}&rdquo;</p>
      )}

      {loading && <SearchSkeleton />}
      {error && <p className="mt-8 text-center text-ig-error">{error}</p>}

      {!loading && results.length === 0 && (
        <p className="text-ig-text-secondary text-center mt-16">No creators found.</p>
      )}

      <div className="space-y-3">
        {results.map((creator) => (
          <CreatorSearchCard key={creator.userId} creator={creator} />
        ))}
      </div>

      {!loading && results.length < total && (
        <button
          onClick={() => fetchPage(page + 1, true)}
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
