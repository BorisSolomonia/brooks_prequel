'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PurchasedTripMap from '@/components/maps/PurchasedTripMap';
import { api } from '@/lib/api';
import { useAccessToken } from '@/hooks/useAccessToken';
import type { MyTripDetail, MyTripItem, MyTripItemUpdateRequest, MyTripSetupRequest, AiKeyResponse } from '@/types';
import { BuyerChatPanel } from '@/components/ai/BuyerChatPanel';

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
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs px-2.5 py-1 rounded-full border border-ig-border text-ig-text-secondary hover:border-brand-500/50 hover:text-brand-400 transition-colors"
      >
        Navigate
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-10 w-44 rounded-xl border border-ig-border bg-ig-elevated shadow-lg py-1">
          <a href={buildMapsUrl(lat, lng)} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-ig-text-primary hover:bg-ig-hover">Google Maps</a>
          <a href={buildAppleMapsUrl(lat, lng)} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-ig-text-primary hover:bg-ig-hover">Apple Maps</a>
          <a href={buildWazeUrl(lat, lng)} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-ig-text-primary hover:bg-ig-hover">Waze</a>
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
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;
  const { token, loading: tokenLoading } = useAccessToken();
  const [trip, setTrip] = useState<MyTripDetail | null>(null);
  const [tripStartDate, setTripStartDate] = useState('');
  const [tripTimezone, setTripTimezone] = useState('UTC');
  const [itemEdits, setItemEdits] = useState<Record<string, { scheduledStart: string; scheduledEnd: string; skipped: boolean }>>({});
  const [visitedMap, setVisitedMap] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiKeys, setAiKeys] = useState<AiKeyResponse[]>([]);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
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
      router.push('/api/auth/login');
      return;
    }

    api.get<AiKeyResponse[]>('/api/me/ai-keys', token).then(setAiKeys).catch(() => {});

    api.get<MyTripDetail>(`/api/me/trips/${tripId}`, token)
      .then((response) => {
        setTrip(response);
        setTripStartDate(response.tripStartDate ?? '');
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
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load trip'));
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
      return {
        placeId: item.placeId,
        scheduledStart: fromLocalInputValue(edit?.scheduledStart ?? ''),
        scheduledEnd: fromLocalInputValue(edit?.scheduledEnd ?? ''),
        skipped: edit?.skipped ?? item.skipped,
      };
    });

    try {
      const updated = await api.patch<MyTripDetail>(`/api/me/trips/${tripId}/setup`, {
        tripStartDate: tripStartDate || undefined,
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
      setError(err instanceof Error ? err.message : 'Failed to save trip setup');
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
        error: err instanceof Error ? err.message : 'Failed to submit review',
      }));
    }
  };

  if (tokenLoading || !trip) {
    return <div className="max-w-5xl mx-auto px-4 py-12 text-center text-ig-text-tertiary">{error || 'Loading trip...'}</div>;
  }

  const dayGroups = groupByDay(trip.items);
  const sortedDays = Array.from(dayGroups.keys()).sort((a, b) => a - b);

  return (
    <>
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Link href="/trips" className="text-sm text-brand-500 hover:text-brand-400">
            ← Back to My Trips
          </Link>
          <h1 className="mt-3 text-3xl font-semibold text-ig-text-primary">{trip.guide.title}</h1>
          <p className="mt-2 text-sm text-ig-text-secondary">
            Purchased version {trip.guideVersionNumber}. Set your dates, track your visits, and export the itinerary.
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-ig-text-tertiary">
            {trip.guide.region && <span>{trip.guide.region}</span>}
            <span>{trip.guide.dayCount} days</span>
            <span>{trip.guide.placeCount} places</span>
            <span>${(trip.guide.priceCents / 100).toFixed(2)}</span>
            {totalPlaces > 0 && (
              <span className="font-medium text-brand-400">
                {visitedCount} of {totalPlaces} places visited
              </span>
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
        <div className="flex flex-wrap gap-2">
          <a
            href={buildGoogleMapsAllUrl(visibleItems)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-md border border-ig-border px-4 py-2 text-sm font-semibold text-ig-text-primary hover:bg-ig-hover"
          >
            Open in Maps
          </a>
          <button
            onClick={() => setShowCalendarModal(true)}
            className="inline-flex rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Add to Calendar
          </button>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-ig-error">{error}</p>}

      {showReviewPrompt && (
        <div className="mb-6 rounded-2xl border border-brand-500/30 bg-brand-500/5 p-5">
          <h2 className="text-base font-semibold text-ig-text-primary">How was your trip?</h2>
          <p className="mt-1 text-sm text-ig-text-secondary">You&rsquo;ve visited more than half the places. Leave a quick review to help other travelers.</p>
          <div className="mt-3 flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setReview((r) => ({ ...r, rating: star }))}
                className={`text-2xl transition-colors ${star <= review.rating ? 'text-yellow-400' : 'text-ig-border hover:text-yellow-300'}`}
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            placeholder="Share what made it special (optional)"
            value={review.reviewText}
            onChange={(e) => setReview((r) => ({ ...r, reviewText: e.target.value }))}
            rows={2}
            className="mt-3 w-full rounded-md border border-ig-border bg-ig-primary px-3 py-2 text-sm text-ig-text-primary placeholder:text-ig-text-tertiary focus:border-brand-500 focus:outline-none resize-none"
          />
          {review.error && <p className="mt-1 text-xs text-ig-error">{review.error}</p>}
          <button
            onClick={handleSubmitReview}
            disabled={review.rating === 0 || review.submitting}
            className="mt-3 rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {review.submitting ? 'Submitting...' : 'Submit review'}
          </button>
        </div>
      )}

      {review.submitted && (
        <div className="mb-6 rounded-2xl border border-green-500/30 bg-green-500/5 p-4 text-sm text-green-400">
          Thanks for your review! It helps other travelers discover this guide.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-ig-border bg-ig-elevated p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-ig-text-primary">Trip setup</h2>
                <p className="mt-1 text-sm text-ig-text-secondary">
                  Choose when the itinerary starts. The app will prefill timings from creator hints.
                </p>
              </div>
              <button
                onClick={handleSaveSetup}
                disabled={saving}
                className="rounded-md border border-ig-border px-4 py-2 text-sm font-semibold text-ig-text-primary hover:bg-ig-hover disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save setup'}
              </button>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-ig-text-secondary">Trip start date</span>
                <input
                  type="date"
                  value={tripStartDate}
                  onChange={(e) => setTripStartDate(e.target.value)}
                  className="w-full rounded-md border border-ig-border bg-ig-primary px-3 py-2 text-ig-text-primary focus:border-brand-500 focus:outline-none"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-ig-text-secondary">Timezone</span>
                <input
                  type="text"
                  value={tripTimezone}
                  onChange={(e) => setTripTimezone(e.target.value)}
                  className="w-full rounded-md border border-ig-border bg-ig-primary px-3 py-2 text-ig-text-primary focus:border-brand-500 focus:outline-none"
                />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-ig-border bg-ig-elevated p-5">
            <h2 className="text-lg font-semibold text-ig-text-primary">Itinerary</h2>
            <div className="mt-4 space-y-6">
              {sortedDays.map((dayNumber) => {
                const dayItems = dayGroups.get(dayNumber) ?? [];
                const dayVisited = dayItems.filter((i) => visitedMap[i.id]).length;
                const dayTotal = dayItems.length;
                return (
                  <div key={dayNumber}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-brand-400 uppercase tracking-wide">Day {dayNumber}</span>
                      <span className="text-xs text-ig-text-tertiary">{dayVisited}/{dayTotal} visited</span>
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
                        return (
                          <div key={item.placeId} className={`rounded-xl border bg-ig-primary p-4 transition-colors ${isVisited ? 'border-brand-500/30' : 'border-ig-border'}`}>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="flex items-start gap-3 flex-1">
                                <button
                                  onClick={() => handleToggleVisited(item)}
                                  title={isVisited ? 'Mark as not visited' : 'Mark as visited'}
                                  className={`mt-0.5 flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
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
                                <div>
                                  <h3 className={`text-base font-semibold ${isVisited ? 'text-ig-text-secondary line-through' : 'text-ig-text-primary'}`}>
                                    {item.placeName}
                                  </h3>
                                  {item.blockTitle && <p className="text-sm text-ig-text-secondary">{item.blockTitle}</p>}
                                  {item.placeAddress && <p className="mt-1 text-sm text-ig-text-tertiary">{item.placeAddress}</p>}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {item.latitude !== null && item.longitude !== null && (
                                  <NavigateMenu lat={item.latitude} lng={item.longitude} />
                                )}
                                <label className="inline-flex items-center gap-2 text-sm text-ig-text-secondary">
                                  <input
                                    type="checkbox"
                                    checked={edit.skipped}
                                    onChange={(e) => setItemEdits((current) => ({
                                      ...current,
                                      [item.placeId]: { ...edit, skipped: e.target.checked },
                                    }))}
                                  />
                                  Skip
                                </label>
                              </div>
                            </div>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              <input
                                type="datetime-local"
                                value={edit.scheduledStart}
                                onChange={(e) => setItemEdits((current) => ({
                                  ...current,
                                  [item.placeId]: { ...edit, scheduledStart: e.target.value },
                                }))}
                                className="w-full rounded-md border border-ig-border bg-ig-secondary px-3 py-2 text-sm text-ig-text-primary focus:border-brand-500 focus:outline-none"
                              />
                              <input
                                type="datetime-local"
                                value={edit.scheduledEnd}
                                onChange={(e) => setItemEdits((current) => ({
                                  ...current,
                                  [item.placeId]: { ...edit, scheduledEnd: e.target.value },
                                }))}
                                className="w-full rounded-md border border-ig-border bg-ig-secondary px-3 py-2 text-sm text-ig-text-primary focus:border-brand-500 focus:outline-none"
                              />
                            </div>
                            <p className="mt-2 text-xs text-ig-text-tertiary">
                              {item.suggestedStartMinute !== null ? `Creator start hint: +${item.suggestedStartMinute} min.` : 'No creator start hint.'}
                              {item.suggestedDurationMinutes !== null ? ` Suggested: ${item.suggestedDurationMinutes} min.` : ''}
                            </p>
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

        <div className="space-y-6">
          <div className="rounded-2xl border border-ig-border bg-ig-elevated p-5">
            <h2 className="text-lg font-semibold text-ig-text-primary">Trip map</h2>
            <p className="mt-1 text-sm text-ig-text-secondary">
              Skipped places are hidden from the map.
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

          <div className="rounded-2xl border border-ig-border bg-ig-elevated p-5">
            <h2 className="text-lg font-semibold text-ig-text-primary">Quick links</h2>
            <div className="mt-4 space-y-3">
              {visibleItems.map((item) => (
                <a
                  key={item.placeId}
                  href={item.latitude !== null && item.longitude !== null
                    ? `https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`
                    : '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-xl border border-ig-border bg-ig-primary px-4 py-3 text-sm text-ig-text-primary hover:border-brand-500/50"
                >
                  <div className="font-semibold">{item.placeName}</div>
                  {item.placeAddress && <div className="mt-1 text-xs text-ig-text-tertiary">{item.placeAddress}</div>}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* Calendar modal */}
      {showCalendarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => setShowCalendarModal(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-ig-border bg-ig-elevated p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-ig-text-primary mb-1">Add to Calendar</h2>
            <p className="text-sm text-ig-text-secondary mb-5">Choose how to add your trip events to your calendar.</p>
            <div className="space-y-3">
              <a
                href={`/api/me/trips/${trip.id}/calendar.ics`}
                onClick={() => setShowCalendarModal(false)}
                className="block w-full rounded-xl border border-ig-border bg-ig-primary px-4 py-3 text-sm text-ig-text-primary hover:border-brand-500/50 transition-colors"
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
              className="mt-4 w-full text-sm text-ig-text-tertiary hover:text-ig-text-secondary"
            >
              Skip for now
            </button>
          </div>
        </div>
      )}
    </>
  );
}
