'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAccessToken } from '@/hooks/useAccessToken';
import { useCurrency } from '@/hooks/useCurrency';
import type { MyTripSummary, MyTripsResponse } from '@/types';

export default function MyTripsPage() {
  const router = useRouter();
  const { token, loading: tokenLoading } = useAccessToken();
  const { formatAmount } = useCurrency();
  const [trips, setTrips] = useState<MyTripSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tokenLoading) return;
    if (!token) {
      router.push('/api/auth/login');
      return;
    }

    api.get<MyTripsResponse>('/api/me/trips', token)
      .then((response) => setTrips(response.trips))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load trips'))
      .finally(() => setLoading(false));
  }, [router, token, tokenLoading]);

  if (tokenLoading || loading) {
    return <div className="mx-auto max-w-5xl px-4 py-12 text-center text-ig-text-tertiary">Loading trips...</div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="mw-eyebrow">Buyer Library</p>
          <h1 data-tour="trips-page-header" className="mw-section-title mt-2 text-3xl">Purchased guides</h1>
          <p className="mt-2 text-sm text-ig-text-secondary">
            Purchased guide versions live here. Open a trip to set dates, review the map, and export it to your calendar.
          </p>
        </div>
        <Link
          href="/search"
          className="mw-button-secondary min-h-11 rounded-md px-4 py-2 text-sm"
        >
          Find guides
        </Link>
      </div>

      {error && <p className="mb-4 text-sm text-ig-error">{error}</p>}

      {trips.length === 0 ? (
        <div className="mw-card p-8 text-center">
          <p className="font-display text-lg font-black text-ig-text-primary">No purchased trips yet</p>
          <p className="mt-2 text-sm text-ig-text-secondary">
            Buy a guide from a creator to move it into your map and calendar workflow.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {trips.map((trip) => (
            <Link
              key={trip.id}
              href={`/trips/${trip.id}`}
              className="mw-card overflow-hidden p-0 transition-colors hover:border-brand-500/60"
            >
              {trip.coverImageUrl ? (
                <div className="h-44 bg-ig-secondary">
                  <img src={trip.coverImageUrl} alt="" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="flex h-44 items-center justify-center bg-ig-secondary text-4xl text-ig-text-tertiary">🗺️</div>
              )}
              <div className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-display text-lg font-black text-ig-text-primary">{trip.title}</h2>
                  <span className="rounded-pill bg-brand-500/15 px-3 py-1 text-xs font-semibold text-brand-500">
                    v{trip.guideVersionNumber}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-ig-text-tertiary">
                  {trip.region && <span>{trip.region}</span>}
                  <span>{trip.dayCount} days</span>
                  <span>{trip.placeCount} places</span>
                  <span>{formatAmount(trip.amountCents)}</span>
                </div>
                <div className="mt-4 text-sm text-ig-text-secondary">
                  {trip.tripStartDate ? (
                    <span>Trip starts {trip.tripStartDate}</span>
                  ) : (
                    <span>Choose trip dates to build your calendar</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
