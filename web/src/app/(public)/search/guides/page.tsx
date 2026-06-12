'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { GuideSearchResult, PageResponse } from '@/types';
import GuideSearchCard from '@/components/search/GuideSearchCard';
import SearchSkeleton from '@/components/search/SearchSkeleton';
import { type SortOption } from '@/components/search/SearchFilterBar';
import GuideFilterSheet, { countActiveFilters } from '@/components/search/GuideFilterSheet';
import Spinner from '@/components/ui/Spinner';
import Link from 'next/link';


// Major currency units (e.g. "9.99") → integer minor units for the query.
function toMinor(major: string): string | null {
  const n = parseFloat(major);
  if (isNaN(n) || n < 0) return null;
  return String(Math.round(n * 100));
}

function SearchGuidesPageContent() {
  const { t } = useTranslation();

  const GUIDE_SORTS: SortOption[] = [
    { value: 'RELEVANCE', label: t('discovery.search.sortRelevance') },
    { value: 'NEWEST', label: t('discovery.search.sortNewest') },
    { value: 'OLDEST', label: t('discovery.search.sortOldest') },
    { value: 'TOP_RATED', label: t('discovery.search.sortTopRated') },
    { value: 'PRICE_ASC', label: t('discovery.search.sortPriceLowHigh') },
    { value: 'PRICE_DESC', label: t('discovery.search.sortPriceHighLow') },
    { value: 'POPULAR', label: t('discovery.search.sortPopular') },
  ];

  const PERSONAS = [
    { value: 'SOLO', label: t('discovery.search.personaSolo') },
    { value: 'FAMILY', label: t('discovery.search.personaFamily') },
    { value: 'BUDGET', label: t('discovery.search.personaBudget') },
    { value: 'LUXURY', label: t('discovery.search.personaLuxury') },
    { value: 'DIGITAL_NOMAD', label: t('discovery.search.personaDigitalNomad') },
  ];

  const STAGES = [
    { value: '', label: t('discovery.search.stageAny') },
    { value: 'DREAMING', label: t('discovery.search.stageDreaming') },
    { value: 'PLANNING', label: t('discovery.search.stagePlanning') },
    { value: 'EXPERIENCING', label: t('discovery.search.stageExperiencing') },
  ];

  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';
  const [results, setResults] = useState<GuideSearchResult[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([]);
  const [selectedStage, setSelectedStage] = useState('');
  const [minRating, setMinRating] = useState<number | null>(null);
  const [sort, setSort] = useState('RELEVANCE');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);

  const buildUrl = useCallback((pageNum: number) => {
    const params = new URLSearchParams({ page: String(pageNum), size: '20' });
    if (q.trim()) params.set('q', q);
    if (selectedStage) params.set('stage', selectedStage);
    selectedPersonas.forEach((p) => params.append('persona', p));
    if (minRating != null) params.set('minRating', String(minRating));
    if (sort && sort !== 'RELEVANCE') params.set('sort', sort);
    const minMinor = toMinor(priceMin);
    const maxMinor = toMinor(priceMax);
    if (minMinor != null) params.set('minPrice', minMinor);
    if (maxMinor != null) params.set('maxPrice', maxMinor);
    return `/api/search/guides?${params.toString()}`;
  }, [q, selectedPersonas, selectedStage, minRating, sort, priceMin, priceMax]);

  const fetchPage = useCallback(async (pageNum: number, append: boolean) => {
    append ? setLoadingMore(true) : setLoading(true);
    setError(null);
    try {
      const data = await api.get<PageResponse<GuideSearchResult>>(buildUrl(pageNum));
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

  // Badge count for the Filters trigger — stage, each selected persona, rating,
  // non-default sort, and each price bound. Categories now live inside the sheet (BOR-28).
  const activeFilterCount = countActiveFilters(
    { stage: selectedStage, personas: selectedPersonas, minRating, sort, priceMin, priceMax },
    'RELEVANCE',
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href={`/search?q=${encodeURIComponent(q)}`} className="mb-4 inline-block font-display text-sm font-black uppercase tracking-[0.06em] text-brand-500 hover:text-brand-400">
        {t('discovery.search.backToSearch')}
      </Link>
      <h1 className="mw-section-title mb-1 text-xl">{t('discovery.search.guidesTitle')}</h1>
      {/* Result count + Filters trigger share one row (button pinned right). The
          category chips get their OWN full-width scroll row below, so the Filters
          button can never overlap them. Previously the button + a flex-1 scroll
          container without min-w-0 collided (the chips couldn't shrink). */}
      <div className="mb-3 mt-1 flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-sm text-ig-text-secondary">
          {total > 0 ? (q.trim() ? t('discovery.search.totalResultsForQuery', { total, q }) : t('discovery.search.totalGuides', { count: total })) : null}
        </p>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label={t('discovery.search.openFiltersAriaLabel')}
          className="relative inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-ig-border px-4 py-2 text-sm font-semibold text-ig-text-primary transition-colors hover:border-brand-500/40 lg:min-h-0 lg:px-3 lg:py-1 lg:text-xs"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 5h18M6 12h12M10 19h4" />
          </svg>
          {t('discovery.search.filtersTitle')}
          {activeFilterCount > 0 && (
            <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1 text-[11px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {loading && <SearchSkeleton />}
      {error && <p className="mt-8 text-center text-ig-error">{error}</p>}

      {!loading && results.length === 0 && (
        <p className="text-ig-text-secondary text-center mt-16">{t('discovery.search.noGuidesFound')}</p>
      )}

      <div data-tour="guides-list" className="space-y-3">
        {results.map((guide, idx) => (
          <div key={guide.id} data-tour={idx === 0 ? 'first-guide-card' : undefined}>
            <GuideSearchCard guide={guide} />
          </div>
        ))}
      </div>

      {!loading && results.length < total && (
        <button
          onClick={() => fetchPage(page + 1, true)}
          disabled={loadingMore}
          className="mw-button-secondary mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl py-3 disabled:opacity-50"
        >
          {loadingMore && <Spinner />}
          {loadingMore ? t('discovery.search.loadingMore') : t('discovery.search.loadMore')}
        </button>
      )}

      <GuideFilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        committed={{ stage: selectedStage, personas: selectedPersonas, minRating, sort, priceMin, priceMax }}
        stages={STAGES}
        personas={PERSONAS}
        sortOptions={GUIDE_SORTS}
        defaultSort="RELEVANCE"
        onApply={(next) => {
          setSelectedStage(next.stage);
          setSelectedPersonas(next.personas);
          setMinRating(next.minRating);
          setSort(next.sort);
          setPriceMin(next.priceMin);
          setPriceMax(next.priceMax);
        }}
      />
    </div>
  );
}

export default function SearchGuidesPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-4 py-8"><SearchSkeleton /></div>}>
      <SearchGuidesPageContent />
    </Suspense>
  );
}
