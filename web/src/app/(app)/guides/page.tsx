'use client';

import { useState, useEffect } from 'react';
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

type LibraryTab = 'discover' | 'created' | 'saved' | 'purchased';

export default function MyGuidesPage() {
  const { token, loading: tokenLoading } = useAccessToken();
  const { formatAmount } = useCurrency();
  const router = useRouter();
  const toast = useToast();
  const { confirm } = useConfirm();
  const [library, setLibrary] = useState<GuideLibraryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<LibraryTab>('discover');
  const [discover, setDiscover] = useState<GuideSearchResult[]>([]);
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
        setError(err instanceof Error ? err.message : 'Failed to load guides');
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
    api.get<PageResponse<GuideSearchResult>>(`/api/search/guides/feed?page=${pageNum}&size=20`, token)
      .then((res) => {
        setDiscover((prev) => (append ? [...prev, ...res.content] : res.content));
        setDiscoverTotal(res.totalElements);
        setDiscoverPage(pageNum);
      })
      .catch((err) => setDiscoverError(err instanceof Error ? err.message : 'Failed to load guides'))
      .finally(() => setDiscoverLoading(false));
  };

  // Lazy-load Discover the first time its tab is shown (it's the default).
  useEffect(() => {
    if (tokenLoading || !token) return;
    if (activeTab === 'discover' && discover.length === 0 && !discoverLoading && !discoverError) {
      loadDiscover(0, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, tokenLoading, activeTab]);

  if (tokenLoading || loading) {
    return <div className="mx-auto max-w-4xl px-4 py-12 text-center text-ig-text-tertiary">Loading...</div>;
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
          Retry
        </button>
      </div>
    );
  }

  const tabs: { key: LibraryTab; label: string; items: GuideLibraryItem[] }[] = [
    { key: 'created', label: 'Created', items: library?.created ?? [] },
    { key: 'saved', label: 'Saved', items: library?.saved ?? [] },
    { key: 'purchased', label: 'Purchased', items: library?.purchased ?? [] },
  ];

  const activeItems = tabs.find((tab) => tab.key === activeTab)?.items ?? [];

  // Tab buttons: the relevance-ranked Discover feed (BOR-27, default) plus the
  // three personal-library tabs. Discover shows its count only once loaded.
  const tabButtons: { key: LibraryTab; label: string; count: number | null }[] = [
    { key: 'discover', label: 'Discover', count: discoverTotal || null },
    ...tabs.map((t) => ({ key: t.key, label: t.label, count: t.items.length })),
  ];

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
      title: `Delete "${guide.title}"?`,
      body: 'This removes it from your guides and cannot be undone.',
      confirmLabel: 'Delete',
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
      toast.success('Guide deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete guide');
    } finally {
      setDeletingGuideId(null);
    }
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
      toast.error(err instanceof Error ? err.message : 'Failed to prepare calendar trip');
    } finally {
      setCalendarLoadingGuideId(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="mw-section-title text-xl">My Guides</h1>
        <Link
          href="/guides/new"
          data-tour="create-guide"
          className="mw-button-primary min-h-11 rounded-md px-4 py-2 text-sm"
        >
          + New Guide
        </Link>
      </div>

      {/* Tabs on a single horizontally scrollable row (Discover + the 3 library
          tabs can't fit one line on mobile). Keeps the controls compact and clear
          of the "+ New Guide" header button above. */}
      <div className="mb-6 overflow-x-auto border-b-2 border-ig-border pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-2">
          {tabButtons.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`min-h-11 shrink-0 whitespace-nowrap rounded-pill px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-2 border-brand-500 bg-brand-500/15 text-brand-500'
                  : 'border-2 border-ig-border bg-ig-elevated text-ig-text-secondary hover:text-ig-text-primary'
              }`}
            >
              {tab.label}{tab.count != null ? ` (${tab.count})` : ''}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'discover' ? (
        discoverError ? (
          <div className="mw-card py-12 text-center">
            <p className="text-sm text-ig-error">{discoverError}</p>
            <button type="button" onClick={() => loadDiscover(0, false)} className="mt-3 text-sm text-ig-text-secondary underline">
              Retry
            </button>
          </div>
        ) : discoverLoading && discover.length === 0 ? (
          <div className="py-12 text-center text-ig-text-tertiary">Loading guides…</div>
        ) : discover.length === 0 ? (
          <div className="mw-card py-12 text-center">
            <p className="text-ig-text-secondary mb-2">No guides to discover yet</p>
            <p className="text-sm text-ig-text-tertiary">New guides ranked by relevance will appear here.</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {discover.map((g) => (
                <GuideSearchCard key={g.id} guide={g} />
              ))}
            </div>
            {discover.length < discoverTotal && (
              <button
                type="button"
                onClick={() => loadDiscover(discoverPage + 1, true)}
                disabled={discoverLoading}
                className="mw-button-secondary mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl py-3 disabled:opacity-50"
              >
                {discoverLoading && <Spinner />}
                {discoverLoading ? 'Loading…' : 'Load more'}
              </button>
            )}
          </>
        )
      ) : activeItems.length === 0 ? (
        <div className="mw-card py-12 text-center">
          <p className="text-ig-text-secondary mb-2">
            {activeTab === 'created' && "You haven't created any guides yet"}
            {activeTab === 'saved' && "You haven't saved any guides yet"}
            {activeTab === 'purchased' && "You haven't purchased any guides yet"}
          </p>
          <p className="text-sm text-ig-text-tertiary">
            {activeTab === 'created' && 'Create your first travel guide to start sharing your adventures.'}
            {activeTab === 'saved' && 'Save guides you want to revisit before buying them.'}
            {activeTab === 'purchased' && 'Purchased guides will appear here after checkout completes.'}
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
                        Saved
                      </span>
                    )}
                    {activeTab === 'purchased' && (
                      <span className="shrink-0 rounded-pill bg-ig-success/15 px-2 py-0.5 text-xs font-semibold text-ig-success">
                        Purchased
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ig-text-tertiary">
                    {(guide.displayLocation || guide.region) && <span>{guide.displayLocation || guide.region}</span>}
                    <span>{guide.dayCount} days</span>
                    <span>{guide.spotCount ?? guide.placeCount} spots</span>
                    <span>{formatPrice(guide)}</span>
                  </div>
                  {guide.popularThisWeek && (
                    <span className="mt-2 inline-flex rounded-pill bg-brand-500/15 px-2.5 py-1 text-xs font-semibold text-brand-500">
                      Popular this week
                    </span>
                  )}
                  {guide.creatorUsername && activeTab !== 'created' && (
                    <p className="mt-2 text-xs text-ig-text-tertiary">@{guide.creatorUsername}</p>
                  )}
                  {activeTab === 'saved' && formatDate(guide.savedAt) && (
                    <p className="mt-2 text-xs text-ig-text-tertiary">Saved {formatDate(guide.savedAt)}</p>
                  )}
                  {activeTab === 'purchased' && formatDate(guide.purchasedAt) && (
                    <p className="mt-2 text-xs text-ig-text-tertiary">Purchased {formatDate(guide.purchasedAt)}</p>
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
                    {calendarLoadingGuideId === guide.id ? 'Preparing...' : 'Add to calendar'}
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
                    {deletingGuideId === guide.id ? 'Deleting…' : 'Delete'}
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
