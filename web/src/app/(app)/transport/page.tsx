'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAccessToken } from '@/hooks/useAccessToken';
import type { MyTripSummary, MyTripsResponse, MyTripDetail } from '@/types';

interface TransportPlace {
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface TransportGroup {
  guideTitle: string;
  primaryCity: string | null;
  tripId: string;
  places: TransportPlace[];
}

function NavigateLinks({ name, address, latitude, longitude }: TransportPlace) {
  const query = encodeURIComponent(address || name);
  const latLng = latitude != null && longitude != null ? `${latitude},${longitude}` : null;

  const googleUrl = latLng
    ? `https://www.google.com/maps/search/?api=1&query=${latLng}`
    : `https://www.google.com/maps/search/?api=1&query=${query}`;

  const wazeUrl = latLng
    ? `https://waze.com/ul?ll=${latLng}&navigate=yes`
    : `https://waze.com/ul?q=${query}&navigate=yes`;

  return (
    <div className="flex gap-2 mt-1">
      <a
        href={googleUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs px-2 py-1 rounded-md bg-ig-elevated border border-ig-border text-ig-text-secondary hover:text-ig-blue hover:border-ig-blue/40 transition-colors"
      >
        Google Maps
      </a>
      <a
        href={wazeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs px-2 py-1 rounded-md bg-ig-elevated border border-ig-border text-ig-text-secondary hover:text-ig-blue hover:border-ig-blue/40 transition-colors"
      >
        Waze
      </a>
    </div>
  );
}

export default function TransportPage() {
  const router = useRouter();
  const { token, loading: tokenLoading } = useAccessToken();
  const [groups, setGroups] = useState<TransportGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tokenLoading) return;
    if (!token) {
      router.push('/api/auth/login');
      return;
    }

    const loadTransport = async () => {
      try {
        const response = await api.get<MyTripsResponse>('/api/me/trips', token);
        const trips = response.trips;

        const detailResults = await Promise.allSettled(
          trips.map((t: MyTripSummary) => api.get<MyTripDetail>(`/api/me/trips/${t.id}`, token))
        );

        const result: TransportGroup[] = [];
        detailResults.forEach((res, i) => {
          if (res.status !== 'fulfilled') return;
          const detail = res.value;
          const transportItems = detail.items.filter(
            (item) => item.blockCategory === 'TRANSPORT' && !item.skipped
          );
          if (transportItems.length === 0) return;
          result.push({
            guideTitle: trips[i].title,
            primaryCity: trips[i].primaryCity,
            tripId: trips[i].id,
            places: transportItems.map((item) => ({
              name: item.placeName,
              address: item.placeAddress,
              latitude: item.latitude,
              longitude: item.longitude,
            })),
          });
        });

        setGroups(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load transport info');
      } finally {
        setLoading(false);
      }
    };

    loadTransport();
  }, [router, token, tokenLoading]);

  if (tokenLoading || loading) {
    return <div className="max-w-2xl mx-auto px-4 py-12 text-center text-ig-text-tertiary">Loading...</div>;
  }

  if (error) {
    return <div className="max-w-2xl mx-auto px-4 py-12 text-center text-ig-error">{error}</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-semibold text-ig-text-primary mb-6">Getting Around</h1>

      {groups.length === 0 ? (
        <div className="rounded-xl border border-ig-border bg-ig-elevated p-6 text-center">
          <p className="text-ig-text-secondary text-sm">No transport information yet.</p>
          <p className="text-ig-text-tertiary text-xs mt-1">Purchase a guide with transport blocks to see directions here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.tripId}>
              <h2 className="text-sm font-semibold text-ig-text-primary mb-3">
                Getting Around in {group.primaryCity || group.guideTitle}
              </h2>
              <div className="space-y-2">
                {group.places.map((place, i) => (
                  <div key={i} className="rounded-xl border border-ig-border bg-ig-elevated p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-ig-text-primary">{place.name}</p>
                        {place.address && (
                          <p className="text-xs text-ig-text-tertiary mt-0.5">{place.address}</p>
                        )}
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-ig-secondary border border-ig-border text-ig-text-tertiary flex-shrink-0">
                        🚌 Transport
                      </span>
                    </div>
                    <NavigateLinks {...place} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
