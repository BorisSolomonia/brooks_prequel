'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap, Marker as LeafletMarker, TileLayer as LeafletTileLayer, LeafletMouseEvent } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAccessToken } from '@/hooks/useAccessToken';
import { useRouter } from 'next/navigation';
import { redirectToLogin } from '@/lib/capacitor';
import { api } from '@/lib/api';
import { ImageUploadField } from '@/components/media/ImageUploadField';
import { rasterTileUrl, useMapboxStyle } from '@/lib/mapboxStyle';
import Spinner from '@/components/ui/Spinner';
import type { Profile, ProfileUpdateRequest } from '@/types';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_PUBLIC_TOKEN ?? '';

// Profile-location pin-picker. Leaflet + Mapbox RASTER tiles (no WebGL): the
// Android System WebView's GPU layer never frees mapbox-gl's tile GL textures
// on pan (→ ~4 GB → LMK kill). Raster <img> tiles have nothing to leak.
// See POSTMORTEM_MAPS_GPU_OOM.md.
function ProfileLocationMap({ lat, lng, onChange }: { lat: string; lng: string; onChange: (lat: string, lng: string) => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const tileLayerRef = useRef<LeafletTileLayer | null>(null);
  const mapboxStyle = useMapboxStyle();

  // Live theme switch: swap the raster tile URL rather than rebuilding the map.
  useEffect(() => {
    tileLayerRef.current?.setUrl(rasterTileUrl(mapboxStyle, MAPBOX_TOKEN));
  }, [mapboxStyle]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !MAPBOX_TOKEN) return;
    let cancelled = false;

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const hasCoords = !isNaN(latNum) && !isNaN(lngNum);
    // Leaflet uses [lat, lng]. Default to a world view when coords are unset.
    const center: [number, number] = hasCoords ? [latNum, lngNum] : [20, 0];

    const init = async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        center,
        zoom: hasCoords ? 8 : 1,
        zoomControl: true,
        attributionControl: true,
        zoomSnap: 0.5,
      });
      mapRef.current = map;

      tileLayerRef.current = L.tileLayer(rasterTileUrl(mapboxStyle, MAPBOX_TOKEN), {
        tileSize: 512,
        zoomOffset: -1,
        minZoom: 1,
        maxZoom: 20,
        crossOrigin: true,
        attribution: '© Mapbox © OpenStreetMap',
      }).addTo(map);

      const icon = L.divIcon({
        html: '<div style="width:22px;height:22px;border-radius:9999px;background:#3b82f6;border:3px solid #fff;box-shadow:0 4px 10px rgba(0,0,0,0.35)"></div>',
        className: '',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      const marker = L.marker(center, { draggable: true, icon }).addTo(map);
      markerRef.current = marker;

      const round = (n: number) => Math.round(n * 1e6) / 1e6;
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onChange(String(round(pos.lat)), String(round(pos.lng)));
      });
      map.on('click', (e: LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        onChange(String(round(e.latlng.lat)), String(round(e.latlng.lng)));
      });

      map.whenReady(() => {
        if (cancelled) return;
        map.invalidateSize();
        requestAnimationFrame(() => { if (!cancelled) map.invalidateSize(); });
      });
    };

    init().catch(() => {});
    return () => {
      cancelled = true;
      markerRef.current?.remove();
      markerRef.current = null;
      tileLayerRef.current = null;
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
  const { token, loading: tokenLoading } = useAccessToken();
  const router = useRouter();

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
      redirectToLogin();
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
            className="min-h-11 w-full rounded-lg border border-ig-border bg-ig-elevated px-3 py-2 text-base text-ig-text-primary"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ig-text-secondary mb-1">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="min-h-11 w-full rounded-lg border border-ig-border bg-ig-elevated px-3 py-2 text-base text-ig-text-primary"
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
            className="w-full rounded-lg border border-ig-border bg-ig-elevated px-3 py-2 text-base text-ig-text-primary"
          />
        </div>

        <ImageUploadField
          token={token!}
          usage="PROFILE_AVATAR"
          label="Profile picture"
          value={avatarUrl}
          onChange={setAvatarUrl}
          previewShape="circle"
          helpText="JPEG, PNG, or WebP. This image appears on your public profile."
        />

        <div>
          <label className="block text-sm font-medium text-ig-text-secondary mb-1">Region</label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="min-h-11 w-full rounded-lg border border-ig-border bg-ig-elevated px-3 py-2 text-base text-ig-text-primary"
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
                <input type="number" step="0.000001" value={latitude} onChange={(e) => setLatitude(e.target.value)} className="min-h-11 w-full rounded-lg border border-ig-border bg-ig-elevated px-3 py-2 text-base text-ig-text-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ig-text-secondary mb-1">Longitude</label>
                <input type="number" step="0.000001" value={longitude} onChange={(e) => setLongitude(e.target.value)} className="min-h-11 w-full rounded-lg border border-ig-border bg-ig-elevated px-3 py-2 text-base text-ig-text-primary" />
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
                className={`min-h-11 rounded-pill px-4 py-2 text-sm font-medium transition-colors ${
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
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-500 py-3 font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
        >
          {saving && <Spinner />}
          {saving ? 'Saving...' : 'Save Profile'}
        </button>

        <a
          href="/profile/payout"
          className="mt-4 block rounded-lg border-2 border-ig-border bg-ig-elevated p-4 text-sm text-ig-text-secondary transition-colors hover:border-brand-500/60 hover:text-ig-text-primary"
        >
          <span className="font-display text-xs font-black uppercase tracking-[0.08em] text-brand-500">Payout details</span>
          <span className="mt-1 block">Set or update your IBAN so the platform can send you your share of guide sales →</span>
        </a>
      </form>
    </div>
  );
}
