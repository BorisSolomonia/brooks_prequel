'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { UnifiedSearchResponse } from '@/types';
import SearchSection from '@/components/search/SearchSection';
import CreatorSearchCard from '@/components/search/CreatorSearchCard';
import GuideSearchCard from '@/components/search/GuideSearchCard';
import PlaceSearchCard from '@/components/search/PlaceSearchCard';
import SearchSkeleton from '@/components/search/SearchSkeleton';

// BOR-37: the dedicated full-page results view that Enter (and the "Search
// everything" button) push onto the current stack. It lives OUTSIDE the
// `/search/` prefix on purpose — `Navbar.isActive('/search')` matches `/search`
// and `/search/*`, so a `/search/...` path would re-light the Explore tab and
// hijack the user's context. `/search-results` matches no bottom tab, so the
// originating tab is left untouched and Android Back simply pops to it.
// The feed itself is the same unified, image-rich UI as Explore (the shared
// `/api/search` endpoint + the premium Creator/Guide/Place cards) — no bespoke
// search logic is introduced here.
function SearchResultsContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const query = (searchParams.get('q') ?? '').trim();

  const [results, setResults] = useState<UnifiedSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query) {
      setResults(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    // Debounced: editing the query in the URL-synced navbar bar while on this
    // page changes `q` per keystroke; coalesce so we issue one request, not one
    // per character.
    const timer = window.setTimeout(() => {
      api.get<UnifiedSearchResponse>(`/api/search?q=${encodeURIComponent(query)}`)
        .then((data) => {
          if (!cancelled) setResults(data);
        })
        .catch((err) => {
          if (!cancelled) setError(err instanceof Error ? err.message : 'Search failed');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  const hasResults = results && (
    results.creatorsTotalCount > 0 ||
    results.guidesTotalCount > 0 ||
    results.placesTotalCount > 0
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mw-section-title mb-1 text-2xl">{t('discovery.search.searchResultsTitle')}</h1>
      {query && (
        <p className="mb-6 text-sm text-ig-text-secondary">
          {t('discovery.search.searchResultsFor', { q: query })}
        </p>
      )}

      {!query && (
        <p className="mt-16 text-center text-ig-text-secondary">
          {t('discovery.search.searchResultsEmptyHint')}
        </p>
      )}

      {loading && <SearchSkeleton />}

      {error && <p className="mt-8 text-center text-ig-error">{error}</p>}

      {!loading && !error && query && results && !hasResults && (
        <p className="mt-16 text-center text-ig-text-secondary">
          {t('discovery.search.noResultsFoundForQuery', { q: query })}
        </p>
      )}

      {!loading && !error && hasResults && (
        <>
          <SearchSection
            title={t('discovery.search.sectionCreators')}
            totalCount={results!.creatorsTotalCount}
            seeAllHref={`/search/creators?q=${encodeURIComponent(query)}`}
          >
            {results!.creators.map((creator) => (
              <CreatorSearchCard key={creator.userId} creator={creator} />
            ))}
          </SearchSection>

          <SearchSection
            title={t('discovery.search.sectionGuides')}
            totalCount={results!.guidesTotalCount}
            seeAllHref={`/search/guides?q=${encodeURIComponent(query)}`}
          >
            {results!.guides.map((guide) => (
              <GuideSearchCard key={guide.id} guide={guide} />
            ))}
          </SearchSection>

          <SearchSection
            title={t('discovery.search.sectionPlaces')}
            totalCount={results!.placesTotalCount}
            seeAllHref={`/search/places?q=${encodeURIComponent(query)}`}
          >
            {results!.places.map((place) => (
              <PlaceSearchCard key={place.id} place={place} />
            ))}
          </SearchSection>
        </>
      )}
    </div>
  );
}

export default function SearchResultsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-2xl px-4 py-8"><SearchSkeleton /></div>}>
      <SearchResultsContent />
    </Suspense>
  );
}
