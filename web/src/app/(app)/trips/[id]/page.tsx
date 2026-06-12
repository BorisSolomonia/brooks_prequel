'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import PurchasedTripMap from '@/components/maps/PurchasedTripMap';
import PlaceCarousel from '@/components/places/PlaceCarousel';
import PlaceReviewPanel from '@/components/reviews/PlaceReviewPanel';
import AddToCalendarModal from '@/components/calendar/AddToCalendarModal';
import { api } from '@/lib/api';
import { useAccessToken } from '@/hooks/useAccessToken';
import { redirectToLogin } from '@/lib/capacitor';
import { useCurrency } from '@/hooks/useCurrency';
import type { MyTripDetail, MyTripItem, MyTripItemUpdateRequest, MyTripSetupRequest, AiKeyResponse, GuidePlace } from '@/types';
import { BuyerChatPanel } from '@/components/ai/BuyerChatPanel';
import Spinner from '@/components/ui/Spinner';
import { useConfirm } from '@/components/ui/ConfirmDialog';

function toLocalInputValue(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInputValue(value: string): string | undefined {
  if (!value) return undefined;
  return new Date(value).toISOString();
}

function buildMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

function buildAppleMapsUrl(lat: number, lng: number): string {
  return `https://maps.apple.com/?q=${lat},${lng}`;
}

function buildWazeUrl(lat: number, lng: number): string {
  return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
}

function buildGoogleMapsAllUrl(items: MyTripItem[]): string {
  const coords = items
    .filter((i) => i.latitude !== null && i.longitude !== null)
    .slice(0, 10)
    .map((i) => `${i.latitude},${i.longitude}`);
  if (coords.length === 0) return '#';
  if (coords.length === 1) return `https://www.google.com/maps/search/?api=1&query=${coords[0]}`;
  return `https://www.google.com/maps/dir/${coords.join('/')}`;
}

function NavigateMenu({ lat, lng }: { lat: number; lng: number }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="min-h-11 rounded-full border border-ig-border px-4 py-2 text-sm text-ig-text-secondary transition-colors hover:border-brand-500/50 hover:text-brand-400 lg:min-h-0 lg:px-2.5 lg:py-1 lg:text-xs"
      >
        {t('guidePages.tripDetail.navigate')}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-10 w-44 rounded-xl border border-ig-border bg-ig-elevated shadow-lg py-1 md:left-auto md:right-0">
          <a href={buildMapsUrl(lat, lng)} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}
            className="block px-4 py-3 text-sm text-ig-text-primary hover:bg-ig-hover">Google Maps</a>
          <a href={buildAppleMapsUrl(lat, lng)} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}
            className="block px-4 py-3 text-sm text-ig-text-primary hover:bg-ig-hover">Apple Maps</a>
          <a href={buildWazeUrl(lat, lng)} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}
            className="block px-4 py-3 text-sm text-ig-text-primary hover:bg-ig-hover">Waze</a>
        </div>
      )}
    </div>
  );
}

function groupByDay(items: MyTripItem[]): Map<number, MyTripItem[]> {
  const map = new Map<number, MyTripItem[]>();
  for (const item of items) {
    const group = map.get(item.dayNumber) ?? [];
    group.push(item);
    map.set(item.dayNumber, group);
  }
  return map;
}

interface ReviewFormState {
  rating: number;
  reviewText: string;
  submitting: boolean;
  submitted: boolean;
  error: string | null;
}

export default function TripDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const { confirm } = useConfirm();
  const tripId = params.id as string;
  const { token, loading: tokenLoading } = useAccessToken();
  const { formatAmount } = useCurrency();
  const [trip, setTrip] = useState<MyTripDetail | null>(null);
  const [tripStartDate, setTripStartDate] = useState('');
  const [tripStartTime, setTripStartTime] = useState('09:00');
  const [tripTimezone, setTripTimezone] = useState('UTC');
  const [itemEdits, setItemEdits] = useState<Record<string, { scheduledStart: string; scheduledEnd: string; skipped: boolean }>>({});
  const [visitedMap, setVisitedMap] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiKeys, setAiKeys] = useState<AiKeyResponse[]>([]);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [removing, setRemoving] = useState(false);

  const handleRemoveTrip = async () => {
    if (!token || removing) return;
    const ok = await confirm({
      title: t('guidePages.tripDetail.removeConfirmTitle'),
      body: t('guidePages.tripDetail.removeConfirmBody'),
      confirmLabel: t('guidePages.tripDetail.removeConfirmLabel'),
      destructive: true,
    });
    if (!ok) return;
    setRemoving(true);
    try {
      await api.delete(`/api/me/trips/${tripId}`, token);
      router.push('/trips');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('guidePages.tripDetail.errorCouldNotRemove'));
      setRemoving(false);
    }
  };
  const [review, setReview] = useState<ReviewFormState>({
    rating: 0,
    reviewText: '',
    submitting: false,
    submitted: false,
    error: null,
  });

  useEffect(() => {
    if (tokenLoading) return;
    if (!token) {
      redirectToLogin();
      return;
    }

    api.get<AiKeyResponse[]>('/api/me/ai-keys', token).then(setAiKeys).catch(() => {});

    api.get<MyTripDetail>(`/api/me/trips/${tripId}`, token)
      .then((response) => {
        setTrip(response);
        setTripStartDate(response.tripStartDate ?? '');
        setTripStartTime((response.tripStartTime || '09:00').slice(0, 5));
        setTripTimezone(response.tripTimezone || response.guide.timezone || 'UTC');
        const edits: Record<string, { scheduledStart: string; scheduledEnd: string; skipped: boolean }> = {};
        const visited: Record<string, boolean> = {};
        response.items.forEach((item) => {
          edits[item.placeId] = {
            scheduledStart: toLocalInputValue(item.scheduledStart),
            scheduledEnd: toLocalInputValue(item.scheduledEnd),
            skipped: item.skipped,
          };
          visited[item.id] = item.visited;
        });
        setItemEdits(edits);
        setVisitedMap(visited);
      })
      .catch((err) => setError(err instanceof Error ? err.message : t('guidePages.tripDetail.errorFailedToLoad')));
  }, [router, token, tokenLoading, tripId]);

  const visibleItems = useMemo(
    () => (trip?.items || []).filter((item) => !(itemEdits[item.placeId]?.skipped ?? item.skipped)),
    [itemEdits, trip?.items],
  );

  const totalPlaces = trip?.items.length ?? 0;
  const visitedCount = useMemo(
    () => Object.values(visitedMap).filter(Boolean).length,
    [visitedMap],
  );
  const showReviewPrompt = totalPlaces > 0 && visitedCount >= Math.ceil(totalPlaces * 0.5) && !review.submitted;

  const placeLookup = useMemo(() => {
    const map = new Map<string, GuidePlace>();
    trip?.guide.days.forEach((day) => {
      day.blocks.forEach((block) => {
        block.places.forEach((place) => {
          map.set(place.id, place);
        });
      });
    });
    return map;
  }, [trip?.guide]);

  const handleToggleVisited = async (item: MyTripItem) => {
    if (!token) return;
    const nowVisited = !visitedMap[item.id];
    setVisitedMap((prev) => ({ ...prev, [item.id]: nowVisited }));
    try {
      await api.patch<MyTripItem>(`/api/me/trips/${tripId}/items/${item.id}/visited`, {}, token);
    } catch {
      setVisitedMap((prev) => ({ ...prev, [item.id]: !nowVisited }));
    }
  };

  const handleSaveSetup = async () => {
    if (!token || !trip) return;
    setSaving(true);
    setError(null);

    const items: MyTripItemUpdateRequest[] = trip.items.map((item) => {
      const edit = itemEdits[item.placeId];
      const originalStart = toLocalInputValue(item.scheduledStart);
      const originalEnd = toLocalInputValue(item.scheduledEnd);
      const editedStart = edit?.scheduledStart ?? '';
      const editedEnd = edit?.scheduledEnd ?? '';
      return {
        placeId: item.placeId,
        scheduledStart: editedStart && editedStart !== originalStart ? fromLocalInputValue(editedStart) : undefined,
        scheduledEnd: editedEnd && editedEnd !== originalEnd ? fromLocalInputValue(editedEnd) : undefined,
        skipped: edit?.skipped ?? item.skipped,
      };
    });

    try {
      const updated = await api.patch<MyTripDetail>(`/api/me/trips/${tripId}/setup`, {
        tripStartDate: tripStartDate || undefined,
        tripStartTime: tripStartTime || undefined,
        tripTimezone: tripTimezone || undefined,
        items,
      } as MyTripSetupRequest, token);

      setTrip(updated);
      const edits: Record<string, { scheduledStart: string; scheduledEnd: string; skipped: boolean }> = {};
      updated.items.forEach((item) => {
        edits[item.placeId] = {
          scheduledStart: toLocalInputValue(item.scheduledStart),
          scheduledEnd: toLocalInputValue(item.scheduledEnd),
          skipped: item.skipped,
        };
      });
      setItemEdits(edits);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('guidePages.tripDetail.errorFailedToSaveSetup'));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!token || review.rating === 0) return;
    setReview((r) => ({ ...r, submitting: true, error: null }));
    try {
      await api.post(`/api/me/trips/${tripId}/review`, {
        rating: review.rating,
        reviewText: review.reviewText || undefined,
      }, token);
      setReview((r) => ({ ...r, submitting: false, submitted: true }));
    } catch (err) {
      setReview((r) => ({
        ...r,
        submitting: false,
        error: err instanceof Error ? err.message : t('guidePages.tripDetail.errorFailedToSubmitReview'),
      }));
    }
  };

  if (tokenLoading || !trip) {
    return <div className="mx-auto max-w-5xl px-4 py-12 text-center text-ig-text-tertiary">{error || t('guidePages.tripDetail.loading')}</div>;
  }

  const dayGroups = groupByDay(trip.items);
  const sortedDays = Array.from(dayGroups.keys()).sort((a, b) => a - b);

  return (
    <>
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Link href="/trips" className="text-sm text-brand-500 hover:text-brand-400">
            {t('guidePages.tripDetail.backToPurchased')}
          </Link>
          <h1 className="mw-section-title mt-3 text-2xl md:text-3xl">{trip.guide.title}</h1>
          <p className="mt-2 text-sm text-ig-text-secondary">
            {t('guidePages.tripDetail.purchasedVersionHint', { version: trip.guideVersionNumber })}
          </p>
          <div className="mt-3 text-xs text-ig-text-tertiary">
            <p>
              {[
                trip.guide.region,
                t('guidePages.tripDetail.dayStat', { count: trip.guide.dayCount }),
                t('guidePages.tripDetail.placeStat', { count: trip.guide.placeCount }),
                formatAmount(trip.guide.priceCents),
              ].filter(Boolean).join(' • ')}
            </p>
            {totalPlaces > 0 && (
              <p className="mt-1 font-medium text-brand-400">
                {t('guidePages.tripDetail.visitedProgress', { visited: visitedCount, total: totalPlaces })}
              </p>
            )}
          </div>
          {totalPlaces > 0 && (
            <div className="mt-3 h-1.5 w-full max-w-xs rounded-full bg-ig-border overflow-hidden">
              <div
                className="h-full rounded-full bg-brand-500 transition-all duration-300"
                style={{ width: `${(visitedCount / totalPlaces) * 100}%` }}
              />
            </div>
          )}
        </div>
        <div className="flex w-full flex-wrap gap-2 md:w-auto">
          <a
            href={buildGoogleMapsAllUrl(visibleItems)}
            target="_blank"
            rel="noreferrer"
            className="mw-button-secondary min-h-11 flex-1 rounded-md px-4 py-2 text-sm md:flex-none"
          >
            {t('guidePages.tripDetail.openInMaps')}
          </a>
          <button
            onClick={() => setShowCalendarModal(true)}
            className="mw-button-primary min-h-11 flex-1 rounded-md px-4 py-2 text-sm md:flex-none"
          >
            {t('guidePages.tripDetail.addToCalendar')}
          </button>
          <button
            onClick={handleRemoveTrip}
            disabled={removing}
            className="min-h-11 flex-1 rounded-md border border-ig-error/30 bg-ig-error/10 px-4 py-2 text-sm font-semibold text-ig-error transition-colors hover:bg-ig-error/15 disabled:opacity-60 md:flex-none"
          >
            {removing ? t('guidePages.tripDetail.removingGuide') : t('guidePages.tripDetail.removeGuide')}
          </button>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-ig-error">{error}</p>}

      {showReviewPrompt && (
        <div className="mw-card mb-6 p-5">
          <h2 className="font-display text-base font-black text-ig-text-primary">{t('guidePages.tripDetail.reviewPromptTitle')}</h2>
          <p className="mt-1 text-sm text-ig-text-secondary">{t('guidePages.tripDetail.reviewPromptBody')}</p>
          <div className="mt-3 flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setReview((r) => ({ ...r, rating: star }))}
              className={`min-h-11 min-w-11 rounded-full text-2xl transition-colors ${star <= review.rating ? 'text-accent-500' : 'text-ig-border hover:text-accent-400'}`}
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            placeholder={t('guidePages.tripDetail.reviewPlaceholder')}
            value={review.reviewText}
            onChange={(e) => setReview((r) => ({ ...r, reviewText: e.target.value }))}
            rows={2}
            className="mt-3 w-full resize-none rounded-md border-2 border-ig-border bg-ig-primary px-3 py-2 text-base text-ig-text-primary placeholder:text-ig-text-tertiary focus:border-brand-500 focus:outline-none md:text-sm"
          />
          {review.error && <p className="mt-1 text-xs text-ig-error">{review.error}</p>}
          <button
            onClick={handleSubmitReview}
            disabled={review.rating === 0 || review.submitting}
            className="mw-button-primary mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm disabled:opacity-50"
          >
            {review.submitting && <Spinner />}
            {review.submitting ? t('guidePages.tripDetail.reviewSubmitting') : t('guidePages.tripDetail.reviewSubmit')}
          </button>
        </div>
      )}

      {review.submitted && (
        <div className="mb-6 rounded-2xl border border-green-500/30 bg-green-500/5 p-4 text-sm text-green-400">
          {t('guidePages.tripDetail.reviewThankYou')}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="order-2 space-y-6 lg:order-1">
          <div className="mw-card p-4 md:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-base font-black text-ig-text-primary md:text-lg">{t('guidePages.tripDetail.tripSetupTitle')}</h2>
                <p className="mt-1 hidden text-sm text-ig-text-secondary md:block">
                  {t('guidePages.tripDetail.tripSetupHint')}
                </p>
              </div>
              <button
                onClick={handleSaveSetup}
                disabled={saving}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-ig-border px-4 py-2 text-sm font-semibold text-ig-text-primary hover:bg-ig-hover disabled:opacity-50 sm:w-auto"
              >
                {saving && <Spinner />}
                {saving ? t('guidePages.tripDetail.saving') : t('guidePages.tripDetail.saveSetup')}
              </button>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <label className="block text-sm">
                <span className="mb-1 block text-ig-text-secondary">{t('guidePages.tripDetail.tripStartDate')}</span>
                <input
                  type="date"
                  value={tripStartDate}
                  onChange={(e) => setTripStartDate(e.target.value)}
                  className="min-h-11 w-full rounded-md border border-ig-border bg-ig-primary px-3 py-2 text-base text-ig-text-primary focus:border-brand-500 focus:outline-none"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-ig-text-secondary">{t('guidePages.tripDetail.startTime')}</span>
                <input
                  type="time"
                  value={tripStartTime}
                  onChange={(e) => setTripStartTime(e.target.value)}
                  className="min-h-11 w-full rounded-md border border-ig-border bg-ig-primary px-3 py-2 text-base text-ig-text-primary focus:border-brand-500 focus:outline-none"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-ig-text-secondary">{t('guidePages.tripDetail.timezone')}</span>
                <input
                  type="text"
                  value={tripTimezone}
                  onChange={(e) => setTripTimezone(e.target.value)}
                  className="min-h-11 w-full rounded-md border border-ig-border bg-ig-primary px-3 py-2 text-base text-ig-text-primary focus:border-brand-500 focus:outline-none"
                />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-ig-border bg-ig-elevated p-4 md:p-5">
            <h2 className="text-base font-semibold text-ig-text-primary md:text-lg">{t('guidePages.tripDetail.itinerary')}</h2>
            <div className="mt-4 space-y-6">
              {sortedDays.map((dayNumber) => {
                const dayItems = dayGroups.get(dayNumber) ?? [];
                const dayVisited = dayItems.filter((i) => visitedMap[i.id]).length;
                const dayTotal = dayItems.length;
                return (
                  <div key={dayNumber}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-brand-400 uppercase tracking-wide">{t('guidePages.tripDetail.dayLabel', { n: dayNumber })}</span>
                      <span className="text-xs text-ig-text-tertiary">{t('guidePages.tripDetail.dayVisitedStat', { visited: dayVisited, total: dayTotal })}</span>
                    </div>
                    <div className="mb-3 h-1 rounded-full bg-ig-border overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand-500/60 transition-all duration-300"
                        style={{ width: dayTotal > 0 ? `${(dayVisited / dayTotal) * 100}%` : '0%' }}
                      />
                    </div>
                    <div className="space-y-3">
                      {dayItems.map((item: MyTripItem) => {
                        const edit = itemEdits[item.placeId] ?? {
                          scheduledStart: toLocalInputValue(item.scheduledStart),
                          scheduledEnd: toLocalInputValue(item.scheduledEnd),
                          skipped: item.skipped,
                        };
                        const isVisited = visitedMap[item.id] ?? item.visited;
                        const placeData = placeLookup.get(item.placeId);
                        const placeTags = placeData?.tags ?? [];
                        const displayTags = placeTags.slice(0, 2);
                        const extraTags = placeTags.length > 2 ? placeTags.length - 2 : 0;
                        const tagLine = displayTags.length > 0
                          ? displayTags.join(' • ') + (extraTags > 0 ? ` • +${extraTags}` : '')
                          : '';
                        return (
                          <div key={item.placeId} className={`rounded-xl border bg-ig-primary transition-colors ${isVisited ? 'border-brand-500/30' : 'border-ig-border'}`}>
                            <div className="flex gap-3 p-3">
                              <div className="flex flex-col items-center gap-2 md:gap-0">
                                <button
                                  onClick={() => handleToggleVisited(item)}
                                  title={isVisited ? t('guidePages.tripDetail.markNotVisited') : t('guidePages.tripDetail.markVisited')}
                                  className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors md:h-7 md:w-7 lg:h-5 lg:w-5 ${
                                    isVisited
                                      ? 'border-brand-500 bg-brand-500 text-white'
                                      : 'border-ig-border hover:border-brand-500/50'
                                  }`}
                                >
                                  {isVisited && (
                                    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  )}
                                </button>
                                <label className="flex flex-col items-center gap-0.5 cursor-pointer md:hidden">
                                  <input
                                    type="checkbox"
                                    checked={edit.skipped}
                                    onChange={(e) => setItemEdits((current) => ({
                                      ...current,
                                      [item.placeId]: { ...edit, skipped: e.target.checked },
                                    }))}
                                    className="h-4 w-4 cursor-pointer"
                                  />
                                  <span className="text-[10px] font-medium text-ig-text-secondary">{t('guidePages.tripDetail.skip')}</span>
                                </label>
                              </div>
                              <div className="w-14 flex-shrink-0 md:w-16">
                                {placeData && placeData.images.length > 0 ? (
                                  <PlaceCarousel images={placeData.images} altPrefix={item.placeName} />
                                ) : (
                                  <div className="h-14 w-14 rounded-lg border border-ig-border bg-ig-elevated md:h-16 md:w-16" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                  <h3 className={`text-sm font-semibold break-words ${isVisited ? 'text-ig-text-secondary line-through' : 'text-ig-text-primary'}`}>
                                    {item.placeName}
                                  </h3>
                                  <div className="flex flex-wrap items-center justify-start gap-1 md:flex-shrink-0 md:justify-end">
                                    {item.latitude !== null && item.longitude !== null && (
                                      <a
                                        href={`https://brooksweb.uk/maps?lat=${item.latitude}&lng=${item.longitude}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex h-11 w-11 items-center justify-center rounded-full text-brand-400 transition-colors hover:bg-brand-500/10 hover:text-brand-300 lg:h-7 lg:w-7"
                                        title={t('guidePages.tripDetail.viewOnMap')}
                                      >
                                        📍
                                      </a>
                                    )}
                                    {item.latitude !== null && item.longitude !== null && (
                                      <NavigateMenu lat={item.latitude} lng={item.longitude} />
                                    )}
                                    <label className="hidden md:inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm text-ig-text-secondary cursor-pointer lg:min-h-9 lg:text-xs">
                                      <input
                                        type="checkbox"
                                        checked={edit.skipped}
                                        onChange={(e) => setItemEdits((current) => ({
                                          ...current,
                                          [item.placeId]: { ...edit, skipped: e.target.checked },
                                        }))}
                                      />
                                      {t('guidePages.tripDetail.skip')}
                                    </label>
                                  </div>
                                </div>
                                <div className="hidden md:block">
                                  {tagLine && <p className="mt-0.5 text-left text-xs text-ig-text-secondary truncate">{tagLine}</p>}
                                  {item.placeAddress && <p className="mt-0.5 text-left text-xs text-ig-text-tertiary line-clamp-2">{item.placeAddress}</p>}
                                  {placeData?.description && <p className="mt-1 text-left text-xs text-ig-text-secondary line-clamp-2">{placeData.description}</p>}
                                </div>
                              </div>
                            </div>
                            <div className="block md:hidden px-3 pb-2 space-y-0.5">
                              {tagLine && <p className="text-left text-xs text-ig-text-secondary truncate">{tagLine}</p>}
                              {item.placeAddress && <p className="text-left text-xs text-ig-text-tertiary line-clamp-2">{item.placeAddress}</p>}
                              {placeData?.description && <p className="text-left text-xs text-ig-text-secondary line-clamp-2">{placeData.description}</p>}
                            </div>
                            <div className="grid gap-3 px-3 pb-3 sm:grid-cols-2">
                              <input
                                type="datetime-local"
                                value={edit.scheduledStart}
                                onChange={(e) => setItemEdits((current) => ({
                                  ...current,
                                  [item.placeId]: { ...edit, scheduledStart: e.target.value },
                                }))}
                                className="min-h-11 w-full rounded-md border border-ig-border bg-ig-secondary px-3 py-2 text-sm text-ig-text-primary focus:border-brand-500 focus:outline-none"
                              />
                              <input
                                type="datetime-local"
                                value={edit.scheduledEnd}
                                onChange={(e) => setItemEdits((current) => ({
                                  ...current,
                                  [item.placeId]: { ...edit, scheduledEnd: e.target.value },
                                }))}
                                className="min-h-11 w-full rounded-md border border-ig-border bg-ig-secondary px-3 py-2 text-sm text-ig-text-primary focus:border-brand-500 focus:outline-none"
                              />
                            </div>
                            <p className="hidden px-3 pb-3 text-xs text-ig-text-tertiary md:block">
                              {item.suggestedStartMinute !== null ? t('guidePages.tripDetail.creatorStartHint', { min: item.suggestedStartMinute }) : t('guidePages.tripDetail.noCreatorStartHint')}
                              {item.suggestedDurationMinutes !== null ? ` ${t('guidePages.tripDetail.suggestedDuration', { min: item.suggestedDurationMinutes })}` : ''}
                            </p>
                            <div className="px-3 pb-3">
                              <PlaceReviewPanel placeId={item.placeId} placeName={item.placeName} token={token} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="order-1 space-y-6 lg:order-2">
          <div className="rounded-2xl border border-ig-border bg-ig-elevated p-4 md:p-5">
            <h2 className="text-base font-semibold text-ig-text-primary md:text-lg">{t('guidePages.tripDetail.tripMap')}</h2>
            <p className="mt-1 text-sm text-ig-text-secondary">
              {t('guidePages.tripDetail.skippedHidden')}
            </p>
            <div className="mt-4">
              <PurchasedTripMap
                items={visibleItems}
                mapboxToken={process.env.NEXT_PUBLIC_MAPBOX_PUBLIC_TOKEN ?? ''}
                mapStyle={process.env.NEXT_PUBLIC_MAPBOX_STYLE ?? ''}
              />
            </div>
          </div>

          {aiKeys.length > 0 && (
            <BuyerChatPanel
              tripId={tripId}
              availableProviders={aiKeys.map((k) => k.provider)}
            />
          )}
        </div>
      </div>


      <div className="mt-6 rounded-2xl border border-ig-border bg-ig-elevated p-4 md:p-5">
        <h2 className="text-base font-semibold text-ig-text-primary md:text-lg">{t('guidePages.tripDetail.quickLinks')}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleItems.map((item) => (
            <a
              key={item.placeId}
              href={item.latitude !== null && item.longitude !== null
                ? `https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`
                : '#'}
              target="_blank"
              rel="noreferrer"
              className="block min-h-14 rounded-xl border border-ig-border bg-ig-primary px-4 py-3 text-sm text-ig-text-primary hover:border-brand-500/50"
            >
              <div className="font-semibold">{item.placeName}</div>
              {item.placeAddress && <div className="mt-1 text-xs text-ig-text-tertiary">{item.placeAddress}</div>}
            </a>
          ))}
        </div>
      </div>
    </div>

      {/* Calendar modal */}
      {false && showCalendarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => setShowCalendarModal(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-ig-border bg-ig-elevated p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-ig-text-primary mb-1">Add to Calendar</h2>
            <p className="text-sm text-ig-text-secondary mb-5">Choose how to add your trip events to your calendar.</p>
            <div className="space-y-3">
              <a
                href={`/api/me/trips/${trip?.id ?? tripId}/calendar.ics`}
                onClick={() => setShowCalendarModal(false)}
                className="block min-h-14 w-full rounded-xl border border-ig-border bg-ig-primary px-4 py-3 text-sm text-ig-text-primary transition-colors hover:border-brand-500/50"
              >
                <div className="font-semibold">Download .ics file</div>
                <div className="text-xs text-ig-text-tertiary mt-0.5">Works with Apple Calendar, Outlook, Google Calendar, and more.</div>
              </a>
              <div className="rounded-xl border border-ig-border bg-ig-primary/40 px-4 py-3 text-sm opacity-50 cursor-not-allowed">
                <div className="font-semibold text-ig-text-secondary">Sync with Google Calendar</div>
                <div className="text-xs text-ig-text-tertiary mt-0.5">Coming soon — automatic sync to your Google Calendar.</div>
              </div>
            </div>
            <button
              onClick={() => setShowCalendarModal(false)}
              className="mt-4 min-h-11 w-full text-sm text-ig-text-tertiary hover:text-ig-text-secondary"
            >
              Skip for now
            </button>
          </div>
        </div>
      )}
      {showCalendarModal && token && (
        <AddToCalendarModal tripId={trip.id} token={token} onClose={() => setShowCalendarModal(false)} />
      )}
    </>
  );
}
