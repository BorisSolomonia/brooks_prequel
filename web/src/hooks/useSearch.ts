'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import type { UnifiedSearchResponse } from '@/types';

interface UseSearchResult {
  query: string;
  search: (q: string) => void;
  results: UnifiedSearchResponse | null;
  loading: boolean;
  error: string | null;
}

export function useSearch(): UseSearchResult {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UnifiedSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string) => {
    setQuery(q);
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!query.trim()) {
      setResults(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    timerRef.current = setTimeout(async () => {
      try {
        const data = await api.get<UnifiedSearchResponse>(
          `/api/search?q=${encodeURIComponent(query.trim())}`
        );
        setResults(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  return { query, search, results, loading, error };
}
