'use client';

import { Suspense, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { GuideSearchResult, PageResponse } from '@/types';
import GuideSearchCard from '@/components/search/GuideSearchCard';
import SearchSkeleton from '@/components/search/SearchSkeleton';

const SEARCH_DEBOUNCE_MS = 250;

function ExploreContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // The URL `?q=` is the single source of truth — it's also what the navbar
  // GlobalSearchBar writes on /search, so both inputs stay in sync.
  const urlQuery = searchParams.get('q') ?? '';

  const [input, setInput] = useState(urlQuery);
  const [results, setResults] = useState<GuideSearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reflect external `?q=` changes (e.g. the navbar search bar) into the input.
  useEffect(() => {
    setInput(urlQuery);
  }, [urlQuery]);

  // BOR-36: populate Explore by default and filter via the SAME shared relevance
  // endpoint the logged-out /search/guides page and the landing/Discover feed use
  // (`GET /api/search/guides`, whose default sort is the global RELEVANCE ranking).
  // No `sort` param => relevance; an empty query => the default top-guides feed;
  // a typed query => the same endpoint filters by it. No bespoke search/sort logic.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ page: '0', size: '20' });
        const q = urlQuery.trim();
        if (q) params.set('q', q);
        const data = await api.get<PageResponse<GuideSearchResult>>(
          `/api/search/guides?${params.toString()}`,
        );
        if (!cancelled) {
          setResults(data.content);
          setTotal(data.totalElements);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load guides');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [urlQuery]);

  const handleChange = (value: string) => {
    setInput(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value.trim()) {
      params.set('q', value.trim());
    } else {
      params.delete('q');
    }
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  };

  const query = urlQuery.trim();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mw-section-title mb-6 text-2xl">{t('discovery.search.exploreTitle')}</h1>

      <div className="relative mb-8">
        <input
          type="text"
          placeholder={t('discovery.search.exploreInputPlaceholder')}
          value={input}
          onChange={(e) => handleChange(e.target.value)}
          className="min-h-12 w-full rounded-xl border-2 border-ig-border bg-ig-elevated px-4 py-3 pl-10 text-base text-ig-text-primary placeholder-ig-text-tertiary outline-none transition focus:border-brand-500"
          aria-label={t('discovery.search.exploreInputAriaLabel')}
        />
        <svg className="absolute left-3 top-3.5 h-5 w-5 text-ig-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Default state is the relevance feed, not a blank screen (BOR-36). */}
      <p className="mw-eyebrow mb-3">
        {query ? t('discovery.search.resultsFor', { q: query }) : t('discovery.search.topGuidesForYou')}
      </p>

      {loading && <SearchSkeleton />}

      {error && <p className="mt-8 text-center text-ig-error">{error}</p>}

      {!loading && !error && results.length === 0 && (
        <p className="mt-16 text-center text-ig-text-secondary">
          {query ? t('discovery.search.noGuidesFoundForQuery', { q: query }) : t('discovery.search.noGuidesAvailable')}
        </p>
      )}

      {!loading && !error && results.length > 0 && (
        <div className="space-y-3">
          {results.map((guide) => (
            <GuideSearchCard key={guide.id} guide={guide} />
          ))}
          {total > results.length && (
            <p className="pt-2 text-center text-xs text-ig-text-tertiary">
              {t('discovery.search.showingOf', { shown: results.length, total })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-2xl px-4 py-8"><SearchSkeleton /></div>}>
      <ExploreContent />
    </Suspense>
  );
}
