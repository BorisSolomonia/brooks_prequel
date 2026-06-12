'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAccessToken } from '@/hooks/useAccessToken';
import { useRouter } from 'next/navigation';
import { redirectToLogin } from '@/lib/capacitor';
import { useCurrency } from '@/hooks/useCurrency';
import { useTranslation } from 'react-i18next';
import type { MyTripSummary, MyTripsResponse } from '@/types';

export default function MyTripsPage() {
  const { t } = useTranslation();
  const { token, loading: tokenLoading } = useAccessToken();
  const router = useRouter();
  const { formatAmount } = useCurrency();
  const [trips, setTrips] = useState<MyTripSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback((hidden: boolean) => {
    if (!token) return;
    setLoading(true);
    api.get<MyTripsResponse>(hidden ? '/api/me/trips/hidden' : '/api/me/trips', token)
      .then((response) => setTrips(response.trips))
      .catch((err) => setError(err instanceof Error ? err.message : t('guidePages.tripsList.errorFailedToLoad')))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (tokenLoading) return;
    if (!token) { redirectToLogin(); return; }
    load(showHidden);
  }, [router, token, tokenLoading, showHidden, load]);

  const hideTrip = async (tripId: string) => {
    if (!token || busyId) return;
    setBusyId(tripId);
    try {
      await api.delete<void>(`/api/me/trips/${tripId}`, token);
      setTrips((cur) => cur.filter((t) => t.id !== tripId));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('guidePages.tripsList.errorFailedToHide'));
    } finally {
      setBusyId(null);
    }
  };

  const unhideTrip = async (tripId: string) => {
    if (!token || busyId) return;
    setBusyId(tripId);
    try {
      await api.post<void>(`/api/me/trips/${tripId}/restore`, undefined, token);
      setTrips((cur) => cur.filter((t) => t.id !== tripId));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('guidePages.tripsList.errorFailedToUnhide'));
    } finally {
      setBusyId(null);
    }
  };

  if (tokenLoading || loading) {
    return <div className="mx-auto max-w-5xl px-4 py-12 text-center text-ig-text-tertiary">{t('guidePages.tripsList.loading')}</div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="mw-eyebrow">{t('guidePages.tripsList.eyebrow')}</p>
          <h1 data-tour="trips-page-header" className="mw-section-title mt-2 text-3xl">
            {showHidden ? t('guidePages.tripsList.titleHidden') : t('guidePages.tripsList.titlePurchased')}
          </h1>
          <p className="mt-2 text-sm text-ig-text-secondary">
            {showHidden
              ? t('guidePages.tripsList.descHidden')
              : t('guidePages.tripsList.descPurchased')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHidden((v) => !v)}
            className="mw-button-secondary min-h-11 rounded-md px-4 py-2 text-sm"
          >
            {showHidden ? t('guidePages.tripsList.backToPurchased') : t('guidePages.tripsList.showHidden')}
          </button>
          {!showHidden && (
            <Link href="/search" className="mw-button-secondary min-h-11 rounded-md px-4 py-2 text-sm">{t('guidePages.tripsList.findGuides')}</Link>
          )}
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-ig-error">{error}</p>}

      {trips.length === 0 ? (
        <div className="mw-card p-8 text-center">
          <p className="font-display text-lg font-black text-ig-text-primary">
            {showHidden ? t('guidePages.tripsList.noHiddenGuides') : t('guidePages.tripsList.noPurchasedTrips')}
          </p>
          <p className="mt-2 text-sm text-ig-text-secondary">
            {showHidden ? t('guidePages.tripsList.noHiddenDesc') : t('guidePages.tripsList.noPurchasedDesc')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {trips.map((trip) => (
            <div key={trip.id} className="mw-card overflow-hidden p-0">
              <Link href={`/trips/${trip.id}`} className="block transition-colors hover:opacity-95">
                {trip.coverImageUrl ? (
                  <div className="relative h-44 bg-ig-secondary">
                    <Image src={trip.coverImageUrl} alt="" fill sizes="(max-width: 768px) 100vw, 384px" className="object-cover" />
                    {trip.noLongerSold && (
                      <span className="absolute left-3 top-3 rounded-pill bg-black/70 px-2.5 py-1 text-xs font-semibold text-white">
                        {t('guidePages.tripsList.noLongerSold')}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex h-44 items-center justify-center bg-ig-secondary text-4xl text-ig-text-tertiary">🗺️</div>
                )}
                <div className="p-4 pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-display text-lg font-black text-ig-text-primary">{trip.title}</h2>
                    <span className="rounded-pill bg-brand-500/15 px-3 py-1 text-xs font-semibold text-brand-500">v{trip.guideVersionNumber}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-ig-text-tertiary">
                    {trip.region && <span>{trip.region}</span>}
                    <span>{t('guidePages.tripsList.dayStat', { count: trip.dayCount })}</span>
                    <span>{t('guidePages.tripsList.placeStat', { count: trip.placeCount })}</span>
                    <span>{formatAmount(trip.amountCents)}</span>
                  </div>
                  {!trip.coverImageUrl && trip.noLongerSold && (
                    <span className="mt-2 inline-block rounded-pill bg-ig-secondary px-2.5 py-1 text-xs font-semibold text-ig-text-secondary">{t('guidePages.tripsList.noLongerSold')}</span>
                  )}
                </div>
              </Link>
              <div className="flex justify-end border-t border-ig-border px-4 py-2">
                {showHidden ? (
                  <button onClick={() => unhideTrip(trip.id)} disabled={busyId === trip.id}
                    className="text-xs font-semibold text-brand-500 hover:underline disabled:opacity-50">
                    {busyId === trip.id ? t('guidePages.tripsList.unhiding') : t('guidePages.tripsList.unhide')}
                  </button>
                ) : (
                  <button onClick={() => hideTrip(trip.id)} disabled={busyId === trip.id}
                    className="text-xs font-semibold text-ig-text-tertiary hover:text-ig-error disabled:opacity-50">
                    {busyId === trip.id ? t('guidePages.tripsList.hiding') : t('guidePages.tripsList.hide')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
