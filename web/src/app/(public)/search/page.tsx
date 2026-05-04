'use client';

import { useSearch } from '@/hooks/useSearch';
import SearchSection from '@/components/search/SearchSection';
import CreatorSearchCard from '@/components/search/CreatorSearchCard';
import GuideSearchCard from '@/components/search/GuideSearchCard';
import PlaceSearchCard from '@/components/search/PlaceSearchCard';
import SearchSkeleton from '@/components/search/SearchSkeleton';

export default function SearchPage() {
  const { query, search, results, loading, error } = useSearch();

  const hasResults = results && (
    results.creatorsTotalCount > 0 ||
    results.guidesTotalCount > 0 ||
    results.placesTotalCount > 0
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mw-section-title mb-6 text-2xl">Explore</h1>

      <div className="relative mb-8">
        <input
          type="text"
          placeholder="Search guides, creators, places..."
          value={query}
          onChange={(e) => search(e.target.value)}
          className="min-h-12 w-full rounded-xl border-2 border-ig-border bg-ig-elevated px-4 py-3 pl-10 text-base text-ig-text-primary placeholder-ig-text-tertiary outline-none transition focus:border-brand-500"
        />
        <svg className="absolute left-3 top-3.5 h-5 w-5 text-ig-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {!query.trim() && (
        <p className="mt-16 text-center text-ig-text-secondary">
          Search for creators, travel guides, or places to explore.
        </p>
      )}

      {loading && <SearchSkeleton />}

      {error && (
        <p className="mt-8 text-center text-ig-error">{error}</p>
      )}

      {!loading && results && !hasResults && (
        <p className="mt-16 text-center text-ig-text-secondary">
          No results found for &ldquo;{results.query}&rdquo;
        </p>
      )}

      {!loading && hasResults && (
        <>
          <SearchSection
            title="Creators"
            totalCount={results!.creatorsTotalCount}
            seeAllHref={`/search/creators?q=${encodeURIComponent(query)}`}
          >
            {results!.creators.map((creator) => (
              <CreatorSearchCard key={creator.userId} creator={creator} />
            ))}
          </SearchSection>

          <SearchSection
            title="Guides"
            totalCount={results!.guidesTotalCount}
            seeAllHref={`/search/guides?q=${encodeURIComponent(query)}`}
          >
            {results!.guides.map((guide) => (
              <GuideSearchCard key={guide.id} guide={guide} />
            ))}
          </SearchSection>

          <SearchSection
            title="Places"
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
