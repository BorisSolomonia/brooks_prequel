'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState, useCallback } from 'react';
import type { GuideSearchResult } from '@/types';
import { useInfinitePagination } from '@/hooks/useInfinitePagination';
import GuideSearchCard from '@/components/search/GuideSearchCard';
import SearchSkeleton from '@/components/search/SearchSkeleton';
import { type SortOption } from '@/components/search/SearchFilterBar';
import GuideFilterSheet, { countActiveFilters } from '@/components/search/GuideFilterSheet';
import Spinner from '@/components/ui/Spinner';
import Link from 'next/link';

const GUIDE_SORTS: SortOption[] = [
  { value: 'RELEVANCE', label: 'Relevance' },
  { value: 'NEWEST', label: 'Newest' },
  { value: 'OLDEST', label: 'Oldest' },
  { value: 'TOP_RATED', label: 'Top rated' },
  { value: 'PRICE_ASC', label: 'Price: low to high' },
  { value: 'PRICE_DESC', label: 'Price: high to low' },
  { value: 'POPULAR', label: 'Popular' },
];

// Major currency units (e.g. "9.99") → integer minor units for the query.
function toMinor(major: string): string | null {
  const n = parseFloat(major);
  if (isNaN(n) || n < 0) return null;
  return String(Math.round(n * 100));
}

const PERSONAS = [
  { value: 'SOLO', label: 'Solo' },
  { value: 'FAMILY', label: 'Family' },
  { value: 'BUDGET', label: 'Budget' },
  { value: 'LUXURY', label: 'Luxury' },
  { value: 'DIGITAL_NOMAD', label: 'Digital Nomad' },
];

const STAGES = [
  { value: '', label: 'Any stage' },
  { value: 'DREAMING', label: 'Dreaming' },
  { value: 'PLANNING', label: 'Planning' },
  { value: 'EXPERIENCING', label: 'Experiencing' },
];

function SearchGuidesPageContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';
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

  const { results, total, loading, loadingMore, error, loadMore } =
    useInfinitePagination<GuideSearchResult>(buildUrl);

  // Badge count for the Filters trigger — stage, each selected persona, rating,
  // non-default sort, and each price bound. Categories now live inside the sheet (BOR-28).
  const activeFilterCount = countActiveFilters(
    { stage: selectedStage, personas: selectedPersonas, minRating, sort, priceMin, priceMax },
    'RELEVANCE',
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href={`/search?q=${encodeURIComponent(q)}`} className="mb-4 inline-block font-display text-sm font-black uppercase tracking-[0.06em] text-brand-500 hover:text-brand-400">
        &larr; Back to search
      </Link>
      <h1 className="mw-section-title mb-1 text-xl">Guides</h1>
      {/* Result count + Filters trigger share one row (button pinned right). The
          category chips get their OWN full-width scroll row below, so the Filters
          button can never overlap them. Previously the button + a flex-1 scroll
          container without min-w-0 collided (the chips couldn't shrink). */}
      <div className="mb-3 mt-1 flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-sm text-ig-text-secondary">
          {total > 0 ? (q.trim() ? <>{total} results for &ldquo;{q}&rdquo;</> : <>{total} guides</>) : null}
        </p>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label="Open filters"
          className="relative inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-ig-border px-4 py-2 text-sm font-semibold text-ig-text-primary transition-colors hover:border-brand-500/40 lg:min-h-0 lg:px-3 lg:py-1 lg:text-xs"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 5h18M6 12h12M10 19h4" />
          </svg>
          Filters
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
        <p className="text-ig-text-secondary text-center mt-16">No guides found.</p>
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
          onClick={loadMore}
          disabled={loadingMore}
          className="mw-button-secondary mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl py-3 disabled:opacity-50"
        >
          {loadingMore && <Spinner />}
          {loadingMore ? 'Loading...' : 'Load more'}
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
