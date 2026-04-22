'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { api } from '@/lib/api';
import type {
  CreatorSearchResult,
  GuideSearchResult,
  PlaceSearchResult,
  UnifiedSearchResponse,
} from '@/types';

const SEARCH_DEBOUNCE_MS = 250;

function buildSearchHref(query: string): string {
  return `/search?q=${encodeURIComponent(query)}`;
}

function buildPlaceHref(place: PlaceSearchResult): string {
  return `/guides/${place.guideId}/view?placeId=${place.id}`;
}

interface SearchResultRowProps {
  href: string;
  title: string;
  subtitle: string;
  meta?: string | null;
  badge?: string | null;
  icon: React.ReactNode;
  onSelect: () => void;
}

function SearchResultRow({ href, title, subtitle, meta, badge, icon, onSelect }: SearchResultRowProps) {
  return (
    <Link
      href={href}
      onClick={onSelect}
      className="flex items-start gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-ig-hover"
    >
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-ig-border bg-ig-primary text-ig-text-secondary">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-ig-text-primary">{title}</p>
          {badge && (
            <span className="rounded-pill border border-ig-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-500">
              {badge}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-ig-text-secondary">{subtitle}</p>
        {meta && <p className="truncate text-[11px] text-ig-text-tertiary">{meta}</p>}
      </div>
    </Link>
  );
}

interface SearchSectionProps {
  title: string;
  count: number;
  children: React.ReactNode;
}

function SearchSection({ title, count, children }: SearchSectionProps) {
  if (!count) {
    return null;
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ig-text-tertiary">{title}</p>
        <span className="text-[11px] text-ig-text-tertiary">{count}</span>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

export default function GlobalSearchBar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [inputValue, setInputValue] = useState('');
  const deferredQuery = useDeferredValue(inputValue.trim());
  const [results, setResults] = useState<UnifiedSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const isUrlSyncedPage = pathname === '/maps' || pathname === '/search';

  useEffect(() => {
    if (!isUrlSyncedPage) {
      return;
    }

    setInputValue(searchParams.get('q') ?? '');
  }, [isUrlSyncedPage, searchParams]);

  useEffect(() => {
    const query = deferredQuery;
    if (!query) {
      setResults(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const timer = window.setTimeout(async () => {
      try {
        const response = await api.get<UnifiedSearchResponse>(`/api/search?q=${encodeURIComponent(query)}`);
        if (!cancelled) {
          setResults(response);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Search failed');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [deferredQuery]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!searchContainerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const totalResults = useMemo(() => {
    if (!results) {
      return 0;
    }

    return results.creators.length + results.guides.length + results.places.length;
  }, [results]);

  const updateUrlQuery = (nextQuery: string) => {
    if (!isUrlSyncedPage) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    if (nextQuery.trim()) {
      params.set('q', nextQuery.trim());
    } else {
      params.delete('q');
    }

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    startTransition(() => {
      router.replace(nextUrl, { scroll: false });
    });
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    setOpen(true);
    updateUrlQuery(value);
  };

  const handleSubmit = () => {
    const query = inputValue.trim();
    if (!query) {
      return;
    }

    setOpen(false);
    startTransition(() => {
      router.push(buildSearchHref(query));
    });
  };

  const clearSearch = () => {
    setInputValue('');
    setResults(null);
    setError(null);
    setOpen(false);
    updateUrlQuery('');
  };

  return (
    <div ref={searchContainerRef} className="relative flex-1 max-w-xl">
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ig-text-tertiary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={inputValue}
          onChange={(event) => handleInputChange(event.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Search creators, guides, places..."
          className="h-10 w-full rounded-full border border-ig-border bg-ig-elevated pl-10 pr-20 text-sm text-ig-text-primary outline-none transition focus:border-brand-500 focus:bg-ig-primary"
          aria-label="Search creators, guides, and places"
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {(loading || isPending) && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-ig-border border-t-brand-500" />
          )}
          {inputValue && (
            <button
              type="button"
              onClick={clearSearch}
              className="flex h-7 w-7 items-center justify-center rounded-full text-ig-text-tertiary transition hover:bg-ig-hover hover:text-ig-text-primary"
              aria-label="Clear search"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {open && inputValue.trim() && (
        <div className="absolute inset-x-0 top-[calc(100%+10px)] z-50 overflow-hidden rounded-[28px] border border-ig-border bg-ig-elevated/95 p-3 shadow-2xl backdrop-blur">
          {error ? (
            <div className="rounded-2xl border border-ig-border bg-ig-primary px-4 py-3 text-sm text-ig-text-secondary">
              {error}
            </div>
          ) : totalResults > 0 ? (
            <div className="space-y-4">
              <SearchSection title="Creators" count={results?.creators.length ?? 0}>
                {results?.creators.slice(0, 3).map((creator: CreatorSearchResult) => (
                  <SearchResultRow
                    key={creator.userId}
                    href={`/creators/${creator.username}`}
                    title={creator.displayName || creator.username}
                    subtitle={`@${creator.username}`}
                    meta={[creator.region, `${creator.followerCount} followers`, `${creator.guideCount} guides`].filter(Boolean).join(' · ')}
                    badge={creator.verified ? 'Verified' : null}
                    onSelect={() => setOpen(false)}
                    icon={
                      creator.avatarUrl ? (
                        <img
                          src={creator.avatarUrl}
                          alt={creator.displayName || creator.username}
                          className="h-9 w-9 object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5.121 17.804A8.966 8.966 0 0112 15c2.331 0 4.455.889 6.04 2.347M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )
                    }
                  />
                ))}
              </SearchSection>

              <SearchSection title="Guides" count={results?.guides.length ?? 0}>
                {results?.guides.slice(0, 3).map((guide: GuideSearchResult) => (
                  <SearchResultRow
                    key={guide.id}
                    href={`/guides/${guide.id}/view`}
                    title={guide.title}
                    subtitle={`by ${guide.creatorDisplayName || guide.creatorUsername}`}
                    meta={[guide.primaryCity || guide.region, `${guide.dayCount} days`, `${guide.placeCount} places`].filter(Boolean).join(' · ')}
                    badge={guide.priceCents === 0 ? 'Free' : `${(guide.priceCents / 100).toFixed(2)} ${guide.currency}`}
                    onSelect={() => setOpen(false)}
                    icon={
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5 4.462 5 2 6.79 2 9v10c0-2.21 2.462-4 5.5-4 1.746 0 3.332.477 4.5 1.253m0-10C13.168 5.477 14.754 5 16.5 5 19.538 5 22 6.79 22 9v10c0-2.21-2.462-4-5.5-4-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    }
                  />
                ))}
              </SearchSection>

              <SearchSection title="Places" count={results?.places.length ?? 0}>
                {results?.places.slice(0, 3).map((place: PlaceSearchResult) => (
                  <SearchResultRow
                    key={place.id}
                    href={buildPlaceHref(place)}
                    title={place.name}
                    subtitle={place.address || place.guideTitle}
                    meta={[place.category, place.guideRegion || place.guideTitle].filter(Boolean).join(' · ')}
                    onSelect={() => setOpen(false)}
                    icon={
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    }
                  />
                ))}
              </SearchSection>
            </div>
          ) : (
            <div className="rounded-2xl border border-ig-border bg-ig-primary px-4 py-4">
              <p className="text-sm font-medium text-ig-text-primary">No direct matches</p>
              <p className="mt-1 text-xs text-ig-text-secondary">
                Press Enter to open Explore for &ldquo;{inputValue.trim()}&rdquo;.
              </p>
            </div>
          )}

          <div className="mt-3 border-t border-ig-border pt-3">
            <button
              type="button"
              onClick={handleSubmit}
              className="w-full rounded-2xl border border-ig-border bg-ig-primary px-4 py-2.5 text-left text-sm font-semibold text-ig-text-primary transition hover:bg-ig-hover"
            >
              Search everything for &ldquo;{inputValue.trim()}&rdquo;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
