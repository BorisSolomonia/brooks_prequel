'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AddToCalendarModal from '@/components/calendar/AddToCalendarModal';
import { api } from '@/lib/api';
import { useAccessToken } from '@/hooks/useAccessToken';
import { useCurrency } from '@/hooks/useCurrency';
import type { GuideLibraryItem, GuideLibraryResponse, GuideSearchResult, MyTripSummary, PageResponse, PurchaseResponse } from '@/types';
import GuideSearchCard from '@/components/search/GuideSearchCard';
import Spinner from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useTranslation } from 'react-i18next';

type LibraryTab = 'discover' | 'created' | 'saved' | 'purchased';

// Discover loads in small batches and grows via infinite scroll (BOR-29).
const DISCOVER_PAGE_SIZE = 10;

export default function MyGuidesPage() {
  const { t } = useTranslation();
  const { token, loading: tokenLoading } = useAccessToken();
  const { formatAmount } = useCurrency();
  const router = useRouter();
  const toast = useToast();
  const { confirm } = useConfirm();
  const [library, setLibrary] = useState<GuideLibraryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<LibraryTab>('purchased');
  const [discover, setDiscover] = useState<GuideSearchResult[]>([]);

  // Deep-link support: open the tab named in ?tab= (the profile "Guides" tile
  // links to ?tab=created). Read once on mount — client-only so it neither
  // bails static rendering nor causes a hydration mismatch with the default.
  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    if (tab === 'discover' || tab === 'created' || tab === 'saved' || tab === 'purchased') {
      setActiveTab(tab);
    }
  }, []);
  const [discoverPage, setDiscoverPage] = useState(0);
  const [discoverTotal, setDiscoverTotal] = useState(0);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  const [deletingGuideId, setDeletingGuideId] = useState<string | null>(null);
  const [calendarTripId, setCalendarTripId] = useState<string | null>(null);
  const [calendarLoadingGuideId, setCalendarLoadingGuideId] = useState<string | null>(null);

  useEffect(() => {
    if (tokenLoading) return;
    if (!token) {
      // "Guides" is a browsable concept — never force registration. Logged-out visitors
      // (incl. back-button / deep-link / shared /guides URLs) land on the PUBLIC catalogue
      // instead of bouncing to Auth0. replace() so Back doesn't loop into this redirect.
      router.replace('/search/guides');
      return;
    }
    Promise.all([
      api.get<GuideLibraryResponse>('/api/me/guides/library', token),
      api.get<PageResponse<PurchaseResponse>>('/api/me/purchases?page=0&size=100', token),
    ])
      .then(([guideLibrary, purchases]) => {
        const purchased: GuideLibraryItem[] = purchases.content.map((purchase) => ({
          id: purchase.guideId,
          title: purchase.guideTitle ?? 'Purchased guide',
          coverImageUrl: purchase.guideCoverImageUrl,
          region: purchase.guideRegion,
          dayCount: 0,
          placeCount: 0,
          priceCents: purchase.priceCentsPaid,
          currency: purchase.currency,
          versionNumber: purchase.guideVersionNumber,
          creatorUsername: null,
          savedAt: null,
          purchasedAt: purchase.completedAt ?? purchase.createdAt,
        }));

        setLibrary({
          ...guideLibrary,
          purchased,
        });
      })
      .catch((err) => {
        console.error('[guides] library load failed:', err);
        setError(err instanceof Error ? err.message : t('guidePages.guidesList.errorFailedToLoad'));
      })
      .finally(() => setLoading(false));
  }, [token, tokenLoading, router]);

  // Discover feed (BOR-27): all published guides ranked by relevance, via the
  // AUTHENTICATED relevance endpoint (sends the token so the backend processes the
  // viewer). Reuses the landing GuideSearchCard.
  const loadDiscover = (pageNum: number, append: boolean) => {
    if (!token) return;
    setDiscoverLoading(true);
    setDiscoverError(null);
    api.get<PageResponse<GuideSearchResult>>(`/api/search/guides/feed?page=${pageNum}&size=${DISCOVER_PAGE_SIZE}`, token)
      .then((res) => {
        setDiscover((prev) => (append ? [...prev, ...res.content] : res.content));
        setDiscoverTotal(res.totalElements);
        setDiscoverPage(pageNum);
      })
      .catch((err) => setDiscoverError(err instanceof Error ? err.message : t('guidePages.guidesList.errorFailedToLoad')))
      .finally(() => setDiscoverLoading(false));
  };

  // Lazy-load Discover the first time its tab is shown.
  useEffect(() => {
    if (tokenLoading || !token) return;
    if (activeTab === 'discover' && discover.length === 0 && !discoverLoading && !discoverError) {
      loadDiscover(0, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, tokenLoading, activeTab]);

  // Infinite scroll: when the bottom sentinel of the Discover list enters view and
  // more guides remain, fetch the next batch (BOR-29) — replaces the Load-more button.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (activeTab !== 'discover') return;
    const el = sentinelRef.current;
    if (!el || discover.length === 0 || discover.length >= discoverTotal) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !discoverLoading && discover.length < discoverTotal) {
          loadDiscover(discoverPage + 1, true);
        }
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, discover.length, discoverTotal, discoverLoading, discoverPage]);

  if (tokenLoading || loading) {
    return <div className="mx-auto max-w-4xl px-4 py-12 text-center text-ig-text-tertiary">{t('guidePages.guidesList.loading')}</div>;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <p className="text-sm text-ig-error">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-3 text-sm text-ig-text-secondary underline"
        >
          {t('guidePages.guidesList.retry')}
        </button>
      </div>
    );
  }

  const tabs: { key: LibraryTab; label: string; items: GuideLibraryItem[] }[] = [
    { key: 'created', label: t('guidePages.guidesList.tabCreated'), items: library?.created ?? [] },
    { key: 'saved', label: t('guidePages.guidesList.tabSaved'), items: library?.saved ?? [] },
    { key: 'purchased', label: t('guidePages.guidesList.tabPurchased'), items: library?.purchased ?? [] },
  ];

  const activeItems = tabs.find((tab) => tab.key === activeTab)?.items ?? [];

  // BOR-28: exactly three tabs — Purchased, Discover, Created (in that order).
  // "Saved" is no longer a tab; saved guides surface at the top of Discover.
  const tabButtons: { key: LibraryTab; label: string; count: number | null }[] = [
    { key: 'purchased', label: t('guidePages.guidesList.tabPurchased'), count: library?.purchased.length ?? 0 },
    { key: 'discover', label: t('guidePages.guidesList.tabDiscover'), count: null }, // no count on Discover (BOR-29)
    { key: 'created', label: t('guidePages.guidesList.tabCreated'), count: library?.created.length ?? 0 },
  ];

  // Saved guides (still loaded in the library) are pinned at the top of Discover,
  // rendered with the same GuideSearchCard as the feed — mapped from the library
  // DTO (GuideLibraryItem -> GuideSearchResult; the two shapes are near-identical).
  const savedGuides: GuideSearchResult[] = (library?.saved ?? []).map((it) => ({
    id: it.id,
    title: it.title,
    coverImageUrl: it.coverImageUrl,
    region: it.region,
    primaryCity: null,
    dayCount: it.dayCount,
    placeCount: it.placeCount,
    priceCents: it.priceCents,
    salePriceCents: it.salePriceCents,
    discountPercent: it.discountPercent,
    effectivePriceCents: it.effectivePriceCents,
    currency: it.currency,
    displayLocation: it.displayLocation,
    spotCount: it.spotCount,
    averageRating: it.averageRating,
    reviewCount: it.reviewCount,
    weeklyPopularityScore: it.weeklyPopularityScore,
    popularThisWeek: it.popularThisWeek,
    creatorUsername: it.creatorUsername ?? '',
    creatorDisplayName: null,
  }));

  const formatPrice = (item: GuideLibraryItem) => {
    const cents = item.effectivePriceCents ?? item.priceCents;
    return formatAmount(cents ?? 0, item.currency);
  };

  const formatDate = (value: string | null) => {
    if (!value) return null;
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(value));
  };

  const itemHref = (item: GuideLibraryItem) => {
    if (activeTab === 'created') {
      return `/guides/${item.id}/edit`;
    }
    return `/guides/${item.id}/view`;
  };

  const handleDeleteGuide = async (guide: GuideLibraryItem) => {
    if (!token || deletingGuideId) return;

    const ok = await confirm({
      title: t('guidePages.guidesList.deleteConfirmTitle', { title: guide.title }),
      body: t('guidePages.guidesList.deleteConfirmBody'),
      confirmLabel: t('guidePages.guidesList.delete'),
      destructive: true,
    });
    if (!ok) return;

    setDeletingGuideId(guide.id);
    try {
      await api.delete<void>(`/api/guides/${guide.id}`, token);
      setLibrary((current) => current ? {
        ...current,
        created: current.created.filter((item) => item.id !== guide.id),
      } : current);
      toast.success(t('guidePages.guidesList.guideDeleted'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('guidePages.guidesList.errorFailedToDelete'));
    } finally {
      setDeletingGuideId(null);
    }
  };

  // BOR-56: when a card in the Discover "Saved" section is un-saved (backend
  // confirmed), splice it out of library.saved so the pinned card disappears
  // immediately — fixes the stale-card bug where only the heart toggled. A
  // re-save (saved === true) needs no change here (the card was already shown).
  const handleSaveChange = (guideId: string, isSaved: boolean) => {
    if (isSaved) return;
    setLibrary((current) =>
      current ? { ...current, saved: current.saved.filter((item) => item.id !== guideId) } : current,
    );
  };

  const openCalendarForGuide = async (guide: GuideLibraryItem) => {
    if (!token || calendarLoadingGuideId) return;
    setCalendarLoadingGuideId(guide.id);
    try {
      const trip = activeTab === 'created'
        ? await api.post<MyTripSummary>(`/api/me/guides/${guide.id}/trip-copy`, undefined, token)
        : await api.get<MyTripSummary>(`/api/me/trips/by-guide/${guide.id}`, token);
      setCalendarTripId(trip.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('guidePages.guidesList.errorFailedToPreparCalendar'));
    } finally {
      setCalendarLoadingGuideId(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="mw-section-title text-xl">{t('guidePages.guidesList.pageTitle')}</h1>
        <Link
          href="/guides/new"
          data-tour="create-guide"
          className="mw-button-primary min-h-11 rounded-md px-4 py-2 text-sm"
        >
          {t('guidePages.guidesList.newGuide')}
        </Link>
      </div>

      {/* BOR-28: three tabs in a 3-column grid so they fit the width with no
          horizontal overflow, clear of the "+ New Guide" header button above. */}
      <div className="mb-6 grid grid-cols-3 gap-2 border-b-2 border-ig-border pb-3">
        {tabButtons.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`min-h-11 truncate rounded-pill px-2 py-2 text-center text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'border-2 border-brand-500 bg-brand-500/15 text-brand-500'
                : 'border-2 border-ig-border bg-ig-elevated text-ig-text-secondary hover:text-ig-text-primary'
            }`}
          >
            {tab.label}{tab.count != null ? ` (${tab.count})` : ''}
          </button>
        ))}
      </div>

      {activeTab === 'discover' ? (
        <>
          {/* BOR-28: the user's Saved guides are pinned at the top of Discover,
              ahead of the relevance feed. */}
          {savedGuides.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-3 font-display text-sm font-black uppercase tracking-[0.08em] text-ig-text-secondary">{t('guidePages.guidesList.savedSectionTitle')}</h2>
              <div className="space-y-3">
                {savedGuides.map((g) => (
                  <GuideSearchCard key={`saved-${g.id}`} guide={g} initialSaved onSaveChange={handleSaveChange} />
                ))}
              </div>
            </section>
          )}
          {discoverError ? (
            <div className="mw-card py-12 text-center">
              <p className="text-sm text-ig-error">{discoverError}</p>
              <button type="button" onClick={() => loadDiscover(0, false)} className="mt-3 text-sm text-ig-text-secondary underline">
                {t('guidePages.guidesList.retry')}
              </button>
            </div>
          ) : discoverLoading && discover.length === 0 ? (
            <div className="py-12 text-center text-ig-text-tertiary">{t('guidePages.guidesList.loadingGuides')}</div>
          ) : discover.length === 0 ? (
            savedGuides.length === 0 ? (
              <div className="mw-card py-12 text-center">
                <p className="text-ig-text-secondary mb-2">{t('guidePages.guidesList.noGuidesToDiscover')}</p>
                <p className="text-sm text-ig-text-tertiary">{t('guidePages.guidesList.noGuidesToDiscoverDesc')}</p>
              </div>
            ) : null
          ) : (
            <>
              {savedGuides.length > 0 && (
                <h2 className="mb-3 font-display text-sm font-black uppercase tracking-[0.08em] text-ig-text-secondary">{t('guidePages.guidesList.tabDiscover')}</h2>
              )}
              <div className="space-y-3">
                {discover.map((g) => (
                  <GuideSearchCard key={g.id} guide={g} />
                ))}
              </div>
              {discover.length < discoverTotal && (
                <div ref={sentinelRef} className="flex justify-center py-6">
                  {discoverLoading && <Spinner />}
                </div>
              )}
            </>
          )}
        </>
      ) : activeItems.length === 0 ? (
        <div className="mw-card py-12 text-center">
          <p className="text-ig-text-secondary mb-2">
            {activeTab === 'created' && t('guidePages.guidesList.emptyCreated')}
            {activeTab === 'saved' && t('guidePages.guidesList.emptySaved')}
            {activeTab === 'purchased' && t('guidePages.guidesList.emptyPurchased')}
          </p>
          <p className="text-sm text-ig-text-tertiary">
            {activeTab === 'created' && t('guidePages.guidesList.emptyCreatedDesc')}
            {activeTab === 'saved' && t('guidePages.guidesList.emptySavedDesc')}
            {activeTab === 'purchased' && t('guidePages.guidesList.emptyPurchasedDesc')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {activeItems.map((guide) => (
            <div
              key={guide.id}
              className="mw-card overflow-hidden p-0 transition-colors hover:border-brand-500/60"
            >
              <Link href={itemHref(guide)} className="block">
                {guide.coverImageUrl ? (
                  <div className="h-36 bg-ig-secondary">
                    <img src={guide.coverImageUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="h-36 bg-ig-secondary flex items-center justify-center">
                    <span className="text-ig-text-tertiary text-3xl">🗺️</span>
                  </div>
                )}
                <div className="p-3">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <h3 className="text-sm font-semibold text-ig-text-primary truncate">{guide.title}</h3>
                    {activeTab === 'saved' && (
                    <span className="mw-badge shrink-0">
                        {t('guidePages.guidesList.badgeSaved')}
                      </span>
                    )}
                    {activeTab === 'purchased' && (
                      <span className="shrink-0 rounded-pill bg-ig-success/15 px-2 py-0.5 text-xs font-semibold text-ig-success">
                        {t('guidePages.guidesList.badgePurchased')}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ig-text-tertiary">
                    {(guide.displayLocation || guide.region) && <span>{guide.displayLocation || guide.region}</span>}
                    <span>{t('guidePages.guidesList.dayStat', { count: guide.dayCount })}</span>
                    <span>{t('guidePages.guidesList.spotStat', { count: guide.spotCount ?? guide.placeCount })}</span>
                    <span>{formatPrice(guide)}</span>
                  </div>
                  {guide.popularThisWeek && (
                    <span className="mt-2 inline-flex rounded-pill bg-brand-500/15 px-2.5 py-1 text-xs font-semibold text-brand-500">
                      {t('guidePages.guidesList.popularThisWeek')}
                    </span>
                  )}
                  {guide.creatorUsername && activeTab !== 'created' && (
                    <p className="mt-2 text-xs text-ig-text-tertiary">@{guide.creatorUsername}</p>
                  )}
                  {activeTab === 'saved' && formatDate(guide.savedAt) && (
                    <p className="mt-2 text-xs text-ig-text-tertiary">{t('guidePages.guidesList.savedOn', { date: formatDate(guide.savedAt) })}</p>
                  )}
                  {activeTab === 'purchased' && formatDate(guide.purchasedAt) && (
                    <p className="mt-2 text-xs text-ig-text-tertiary">{t('guidePages.guidesList.purchasedOn', { date: formatDate(guide.purchasedAt) })}</p>
                  )}
                </div>
              </Link>
              {(activeTab === 'created' || activeTab === 'purchased') && (
                <div className="flex justify-stretch border-t-2 border-ig-border px-3 py-2 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => openCalendarForGuide(guide)}
                    disabled={calendarLoadingGuideId === guide.id}
                    className="mw-button-secondary inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto lg:min-h-9 lg:py-1.5 lg:text-xs"
                  >
                    {calendarLoadingGuideId === guide.id && <Spinner />}
                    {calendarLoadingGuideId === guide.id ? t('guidePages.guidesList.preparingCalendar') : t('guidePages.guidesList.addToCalendar')}
                  </button>
                </div>
              )}
              {activeTab === 'created' && (
                <div className="flex justify-stretch border-t-2 border-ig-border px-3 py-2 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => handleDeleteGuide(guide)}
                    disabled={deletingGuideId === guide.id}
                    className="min-h-11 w-full rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto lg:min-h-9 lg:py-1.5 lg:text-xs"
                  >
                    {deletingGuideId === guide.id ? t('guidePages.guidesList.deleting') : t('guidePages.guidesList.delete')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {calendarTripId && token && (
        <AddToCalendarModal tripId={calendarTripId} token={token} onClose={() => setCalendarTripId(null)} />
      )}
    </div>
  );
}
