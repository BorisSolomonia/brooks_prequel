'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map as MapboxMap, Marker as MapboxMarker } from 'mapbox-gl';
import { useRouter } from 'next/navigation';
import PlaceholderNotice from '@/components/ui/PlaceholderNotice';
import { useAccessToken } from '@/hooks/useAccessToken';
import { api } from '@/lib/api';
import type { Profile, ProfileUpdateRequest } from '@/types';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_PUBLIC_TOKEN ?? '';
const MAPBOX_STYLE = process.env.NEXT_PUBLIC_MAPBOX_STYLE ?? 'mapbox://styles/mapbox/streets-v12';

function ProfileLocationMap({ lat, lng, onChange }: { lat: string; lng: string; onChange: (lat: string, lng: string) => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markerRef = useRef<MapboxMarker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !MAPBOX_TOKEN) return;
    let cancelled = false;

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const hasCoords = !isNaN(latNum) && !isNaN(lngNum);
    const center: [number, number] = hasCoords ? [lngNum, latNum] : [0, 20];

    const init = async () => {
      const mapboxglModule = await import('mapbox-gl');
      const mapboxgl = mapboxglModule.default;
      mapboxgl.accessToken = MAPBOX_TOKEN;
      if (cancelled || !containerRef.current) return;

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: MAPBOX_STYLE,
        center,
        zoom: hasCoords ? 8 : 1,
      });
      mapRef.current = map;

      const marker = new mapboxgl.Marker({ draggable: true, color: '#3b82f6' })
        .setLngLat(center)
        .addTo(map);
      markerRef.current = marker;

      marker.on('dragend', () => {
        const pos = marker.getLngLat();
        onChange(String(Math.round(pos.lat * 1e6) / 1e6), String(Math.round(pos.lng * 1e6) / 1e6));
      });

      map.on('click', (e) => {
        marker.setLngLat(e.lngLat);
        onChange(String(Math.round(e.lngLat.lat * 1e6) / 1e6), String(Math.round(e.lngLat.lng * 1e6) / 1e6));
      });
    };

    init().catch(() => {});
    return () => {
      cancelled = true;
      markerRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!MAPBOX_TOKEN) return null;
  return <div ref={containerRef} className="h-44 w-full rounded-lg overflow-hidden border border-ig-border" />;
}

const REGIONS = [
  'Europe', 'North America', 'South America', 'Asia',
  'Africa', 'Oceania', 'Middle East', 'Central America',
];

const INTEREST_OPTIONS = [
  'Adventure', 'Culture', 'Food & Drink', 'Nature',
  'Beach', 'City', 'History', 'Nightlife',
  'Budget', 'Luxury', 'Solo Travel', 'Family',
];

export default function EditProfilePage() {
  const router = useRouter();
  const { token, loading: tokenLoading } = useAccessToken();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [region, setRegion] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tokenLoading) {
      return;
    }

    if (!token) {
      router.push('/api/auth/login');
      return;
    }

    api.get<Profile>('/api/me', token)
      .then((profile) => {
        setDisplayName(profile.displayName ?? '');
        setUsername(profile.username ?? '');
        setBio(profile.bio ?? '');
        setAvatarUrl(profile.avatarUrl ?? '');
        setRegion(profile.region ?? '');
        setLatitude(profile.latitude !== null ? String(profile.latitude) : '');
        setLongitude(profile.longitude !== null ? String(profile.longitude) : '');
        setSelectedInterests(
          profile.interests
            ? profile.interests.split(',').map((interest) => interest.trim()).filter(Boolean)
            : [],
        );
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load profile'))
      .finally(() => setLoading(false));
  }, [router, token, tokenLoading]);

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((item) => item !== interest) : [...prev, interest],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      return;
    }

    setSaving(true);
    setMessage(null);
    setError(null);

    const request: ProfileUpdateRequest = {
      displayName,
      username,
      bio,
      avatarUrl,
      region,
      interests: selectedInterests.join(', '),
      latitude: latitude.trim() ? Number(latitude) : undefined,
      longitude: longitude.trim() ? Number(longitude) : undefined,
    };

    try {
      await api.patch<Profile>('/api/me/profile', request, token);
      setMessage('Profile saved. Your map location is now available to the influencer map when coordinates are set.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (tokenLoading || loading) {
    return <div className="max-w-lg mx-auto px-4 py-12 text-center text-ig-text-tertiary">Loading...</div>;
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <PlaceholderNotice
        title="Profile save is live for map location"
        body="This screen now persists creator profile basics and optional coordinates for the maps experience. Guide lists and richer profile analytics are still pending."
      />

      <h1 className="text-2xl font-bold mb-6 text-ig-text-primary">Complete Your Profile</h1>

      {message && (
        <div className="mb-4 rounded-lg border border-ig-success/30 bg-ig-success/10 px-4 py-3 text-sm text-ig-success">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-ig-error/30 bg-ig-error/10 px-4 py-3 text-sm text-ig-error">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-ig-text-secondary mb-1">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-lg border border-ig-border bg-ig-elevated px-3 py-2 text-ig-text-primary"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ig-text-secondary mb-1">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-lg border border-ig-border bg-ig-elevated px-3 py-2 text-ig-text-primary"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ig-text-secondary mb-1">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            maxLength={500}
            className="w-full rounded-lg border border-ig-border bg-ig-elevated px-3 py-2 text-ig-text-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ig-text-secondary mb-1">Avatar URL</label>
          <input
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            className="w-full rounded-lg border border-ig-border bg-ig-elevated px-3 py-2 text-ig-text-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ig-text-secondary mb-1">Region</label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full rounded-lg border border-ig-border bg-ig-elevated px-3 py-2 text-ig-text-primary"
          >
            <option value="">Select your region</option>
            {REGIONS.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-ig-text-secondary mb-1">Your location</label>
          <p className="text-xs text-ig-text-tertiary mb-2">Click or drag the pin to set where you&apos;re based. This places you on the creator map.</p>
          {MAPBOX_TOKEN ? (
            <ProfileLocationMap
              lat={latitude}
              lng={longitude}
              onChange={(lat, lng) => { setLatitude(lat); setLongitude(lng); }}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-ig-text-secondary mb-1">Latitude</label>
                <input type="number" step="0.000001" value={latitude} onChange={(e) => setLatitude(e.target.value)} className="w-full rounded-lg border border-ig-border bg-ig-elevated px-3 py-2 text-ig-text-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ig-text-secondary mb-1">Longitude</label>
                <input type="number" step="0.000001" value={longitude} onChange={(e) => setLongitude(e.target.value)} className="w-full rounded-lg border border-ig-border bg-ig-elevated px-3 py-2 text-ig-text-primary" />
              </div>
            </div>
          )}
          {latitude && longitude && (
            <p className="text-xs text-ig-text-tertiary mt-1">{latitude}, {longitude}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-ig-text-secondary mb-2">Interests</label>
          <div className="flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map((interest) => (
              <button
                key={interest}
                type="button"
                onClick={() => toggleInterest(interest)}
                className={`rounded-pill px-3 py-1.5 text-sm font-medium transition-colors ${
                  selectedInterests.includes(interest)
                    ? 'bg-brand-600 text-white'
                    : 'bg-ig-elevated text-ig-text-secondary hover:bg-ig-hover'
                }`}
              >
                {interest}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-brand-500 py-3 font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
}
