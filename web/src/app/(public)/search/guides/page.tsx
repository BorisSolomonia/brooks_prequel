'use client';

export const dynamic = 'force-dynamic';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { GuideSearchResult, PageResponse } from '@/types';
import GuideSearchCard from '@/components/search/GuideSearchCard';
import SearchSkeleton from '@/components/search/SearchSkeleton';
import Link from 'next/link';

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
  const [results, setResults] = useState<GuideSearchResult[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([]);
  const [selectedStage, setSelectedStage] = useState('');

  const buildUrl = useCallback((pageNum: number) => {
    const params = new URLSearchParams({ q, page: String(pageNum), size: '20' });
    if (selectedStage) params.set('stage', selectedStage);
    selectedPersonas.forEach((p) => params.append('persona', p));
    return `/api/search/guides?${params.toString()}`;
  }, [q, selectedPersonas, selectedStage]);

  const fetchPage = useCallback(async (pageNum: number, append: boolean) => {
    if (!q.trim()) return;
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
  }, [buildUrl, q]);

  useEffect(() => {
    setResults([]);
    setPage(0);
    fetchPage(0, false);
  }, [fetchPage]);

  const togglePersona = (persona: string) => {
    setSelectedPersonas((prev) =>
      prev.includes(persona) ? prev.filter((p) => p !== persona) : [...prev, persona]
    );
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link href={`/search?q=${encodeURIComponent(q)}`} className="text-sm text-ig-action-blue hover:underline mb-4 inline-block">
        &larr; Back to search
      </Link>
      <h1 className="text-xl font-bold text-ig-text-primary mb-1">Guides</h1>
      {total > 0 && (
        <p className="text-sm text-ig-text-secondary mb-4">{total} results for &ldquo;{q}&rdquo;</p>
      )}

      {/* Stage filter */}
      <div className="flex flex-wrap gap-2 mb-3">
        {STAGES.map((s) => (
          <button
            key={s.value}
            onClick={() => setSelectedStage(s.value)}
            className={`min-h-11 rounded-full border px-4 py-2 text-sm font-semibold transition-colors lg:min-h-0 lg:px-3 lg:py-1 lg:text-xs ${
              selectedStage === s.value
                ? 'border-brand-500 bg-brand-500/15 text-brand-400'
                : 'border-ig-border text-ig-text-secondary hover:border-brand-500/40'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Persona filter chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        {PERSONAS.map((p) => (
          <button
            key={p.value}
            onClick={() => togglePersona(p.value)}
            className={`min-h-11 rounded-full border px-4 py-2 text-sm font-semibold transition-colors lg:min-h-0 lg:px-3 lg:py-1 lg:text-xs ${
              selectedPersonas.includes(p.value)
                ? 'border-brand-500 bg-brand-500/15 text-brand-400'
                : 'border-ig-border text-ig-text-secondary hover:border-brand-500/40'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading && <SearchSkeleton />}
      {error && <p className="text-red-400 text-center mt-8">{error}</p>}

      {!loading && results.length === 0 && (
        <p className="text-ig-text-secondary text-center mt-16">No guides found.</p>
      )}

      <div className="space-y-3">
        {results.map((guide) => (
          <GuideSearchCard key={guide.id} guide={guide} />
        ))}
      </div>

      {!loading && results.length < total && (
        <button
          onClick={() => fetchPage(page + 1, true)}
          disabled={loadingMore}
          className="mt-6 min-h-12 w-full rounded-xl bg-ig-elevated py-3 font-semibold text-ig-text-primary transition-colors hover:bg-ig-border disabled:opacity-50"
        >
          {loadingMore ? 'Loading...' : 'Load more'}
        </button>
      )}
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
