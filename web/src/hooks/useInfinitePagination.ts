'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { PageResponse } from '@/types';

/**
 * Shared state machine for paginated "load more" lists (/search/guides, /search/creators,
 * /search/places). Each page previously copy-pasted the same results/page/total/loading/
 * loadingMore/error block, and every copy shared the same latent race: nothing guarded
 * against an in-flight page resolving AFTER the filters changed, so a slow stale response
 * could overwrite a newer result set. The request-id guard here fixes that once for all
 * callers.
 *
 * `buildUrl` must be referentially stable (wrap it in useCallback) — a new identity resets
 * the list and refetches page 0. Pass `enabled: false` to render an empty list without
 * fetching (e.g. no query yet).
 */
export function useInfinitePagination<T>(buildUrl: (page: number) => string, enabled = true) {
  const [results, setResults] = useState<T[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const fetchPage = useCallback(
    async (pageNum: number, append: boolean) => {
      const requestId = ++requestIdRef.current;
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const data = await api.get<PageResponse<T>>(buildUrl(pageNum));
        if (requestId !== requestIdRef.current) return; // superseded by a newer fetch
        setResults((prev) => (append ? [...prev, ...data.content] : data.content));
        setTotal(data.totalElements);
        setPage(pageNum);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [buildUrl],
  );

  useEffect(() => {
    if (!enabled) {
      setResults([]);
      setLoading(false);
      return;
    }
    setResults([]);
    setPage(0);
    fetchPage(0, false);
  }, [fetchPage, enabled]);

  const loadMore = useCallback(() => fetchPage(page + 1, true), [fetchPage, page]);

  return { results, page, total, loading, loadingMore, error, loadMore };
}
