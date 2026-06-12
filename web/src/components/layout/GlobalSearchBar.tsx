'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import CreatorSearchCard from '@/components/search/CreatorSearchCard';
import GuideSearchCard from '@/components/search/GuideSearchCard';
import PlaceSearchCard from '@/components/search/PlaceSearchCard';
import type {
  CreatorSearchResult,
  GuideSearchResult,
  PlaceSearchResult,
  UnifiedSearchResponse,
} from '@/types';

const SEARCH_DEBOUNCE_MS = 250;

// BOR-37: submit (Enter / "Search everything") pushes a DEDICATED results route,
// not `/search` (the Explore tab) — routing to /search would hijack the bottom
// nav and destroy the user's context. `/search-results` sits outside the
// `/search/` prefix so no bottom tab activates, and Android Back pops to the
// originating page.
function buildSearchHref(query: string): string {
  return `/search-results?q=${encodeURIComponent(query)}`;
}

interface SearchSectionProps {
  title: string;
  count: number;
  // Deep-dive link to the full, filtered list page for this category.
  href: string;
  onNavigate: () => void;
  children: React.ReactNode;
}

function SearchSection({ title, count, href, onNavigate, children }: SearchSectionProps) {
  if (!count) {
    return null;
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between px-1">
        {/* Clickable header → full filtered list for this entity type (BOR-29). */}
        <Link
          href={href}
          onClick={onNavigate}
          className="mw-eyebrow inline-flex items-center gap-1 transition-colors hover:text-brand-500"
        >
          {title}
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
        <span className="text-[11px] text-ig-text-tertiary">{count}</span>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

export default function GlobalSearchBar() {
  const { t } = useTranslation();
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
  // /search-results is URL-synced too so the bar reflects the active query and
  // edits live-update the results page (BOR-37).
  const isUrlSyncedPage = pathname === '/maps' || pathname === '/search' || pathname === '/search-results';

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
    <div ref={searchContainerRef} className="relative min-w-0 flex-1 md:max-w-xl">
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
          placeholder=""
          className="h-12 w-full rounded-full border-2 border-ig-border bg-ig-elevated pl-10 pr-12 text-base text-ig-text-primary outline-none transition placeholder:text-sm focus:border-brand-500 focus:bg-ig-primary md:h-10 md:pr-20 md:text-sm"
          aria-label={t('discovery.search.inputAriaLabel')}
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {(loading || isPending) && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-ig-border border-t-brand-500" />
          )}
          {inputValue && (
            <button
              type="button"
              onClick={clearSearch}
              className="flex h-10 w-10 items-center justify-center rounded-full text-ig-text-tertiary transition hover:bg-ig-hover hover:text-ig-text-primary lg:h-7 lg:w-7"
              aria-label={t('discovery.search.clearAriaLabel')}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {open && inputValue.trim() && (
        <div
          className="mw-panel fixed inset-x-3 z-50 overflow-y-auto rounded-2xl p-3 pb-4 backdrop-blur md:absolute md:inset-x-0 md:top-[calc(100%+10px)] md:max-h-[70vh] md:rounded-[28px]"
          // top + max-height computed from the actual navbar height
          // (h-16 = 4rem) + safe-area-inset-top + small gap, so the
          // popup never starts BEHIND the navbar (or its search input)
          // on notched phones. Was a hard-coded 76px which overlapped
          // the input on devices with > 12px top inset.
          style={{
            top: 'calc(env(safe-area-inset-top) + 4.5rem)',
            maxHeight: 'calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 5.5rem)',
          }}
        >
          {error ? (
            <div className="rounded-2xl border-2 border-ig-border bg-ig-primary px-4 py-3 text-sm text-ig-text-secondary">
              {error}
            </div>
          ) : totalResults > 0 ? (
            <div className="space-y-4">
              {/* BOR-31: the dropdown now renders the same premium cards as the
                  Explore page, while keeping the clickable category headers that
                  deep-dive to the filtered list (?q= carries the typed query).
                  Each card is wrapped so a click also closes the dropdown. */}
              <SearchSection
                title={t('discovery.search.sectionCreators')}
                count={results?.creators.length ?? 0}
                href={`/search/creators?q=${encodeURIComponent(inputValue.trim())}`}
                onNavigate={() => setOpen(false)}
              >
                {results?.creators.slice(0, 2).map((creator: CreatorSearchResult) => (
                  <div key={creator.userId} onClick={() => setOpen(false)}>
                    <CreatorSearchCard creator={creator} />
                  </div>
                ))}
              </SearchSection>

              <SearchSection
                title={t('discovery.search.sectionGuides')}
                count={results?.guides.length ?? 0}
                href={`/search/guides?q=${encodeURIComponent(inputValue.trim())}`}
                onNavigate={() => setOpen(false)}
              >
                {results?.guides.slice(0, 2).map((guide: GuideSearchResult) => (
                  <div key={guide.id} onClick={() => setOpen(false)}>
                    <GuideSearchCard guide={guide} />
                  </div>
                ))}
              </SearchSection>

              <SearchSection
                title={t('discovery.search.sectionPlaces')}
                count={results?.places.length ?? 0}
                href={`/search/places?q=${encodeURIComponent(inputValue.trim())}`}
                onNavigate={() => setOpen(false)}
              >
                {results?.places.slice(0, 2).map((place: PlaceSearchResult) => (
                  <div key={place.id} onClick={() => setOpen(false)}>
                    <PlaceSearchCard place={place} />
                  </div>
                ))}
              </SearchSection>
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-ig-border bg-ig-primary px-4 py-4">
              <p className="text-sm font-medium text-ig-text-primary">{t('discovery.search.noDirectMatches')}</p>
              <p className="mt-1 text-xs text-ig-text-secondary">
                {t('discovery.search.pressEnterHint', { q: inputValue.trim() })}
              </p>
            </div>
          )}

          <div className="mt-3 border-t-2 border-ig-border pt-3">
            <button
              type="button"
              onClick={handleSubmit}
              className="mw-button-secondary min-h-12 w-full rounded-2xl px-4 py-3 text-left text-sm transition hover:bg-ig-hover"
            >
              {t('discovery.search.searchEverything', { q: inputValue.trim() })}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
