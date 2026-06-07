'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { Map as LeafletMap, Marker as LeafletMarker, LayerGroup, TileLayer, LatLngBounds, MarkerClusterGroup } from 'leaflet';

// [lng, lat] tuple (kept lng-first to match the existing API/data shapes and
// avoid touching every call site). Convert to Leaflet's [lat, lng] at use.
type LngLat = [number, number];
import StarRating from '@/components/reviews/StarRating';
import { api } from '@/lib/api';
import { scoreSearchMatch } from '@/lib/fuzzySearch';
import { useMapboxStyle } from '@/lib/mapboxStyle';
import { useAccessToken } from '@/hooks/useAccessToken';
import Spinner from '@/components/ui/Spinner';
import { useOnboarding } from '@/components/onboarding/OnboardingProvider';
import { isNative } from '@/lib/capacitor';
import { useProximityNotifier } from '@/hooks/useProximityNotifier';
import type {
  InfluencerMapPin,
  InfluencerMapResponse,
  MediaUploadResponse,
  Memory,
  MemoryMapPin,
  MemoryMapResponse,
  MemoryMediaRequest,
  MemoryRevealResponse,
  MemoryShareResponse,
  MemoryVisibility,
} from '@/types';
// CSS scoped to the map components so non-map pages don't pay for it.
// Leaflet renders with raster tiles (no WebGL) — the Android System WebView
// does not free mapbox-gl's evicted tile GL textures on pan (proven: stock
// mapbox flat ~104 MB in Chrome, ratchets to ~4 GB → LMK kill in the WebView),
// so we render the map with Leaflet to avoid WebGL entirely.
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

// Bounds-quantization grid for the memory map API. Map pans get snapped
// to a 0.05° (~5.5 km at the equator) grid before being sent to the
// backend, so small pans within a grid cell reuse the previous response
// rather than hammering /api/memories/map. A normal zoom-12 viewport
// spans ~4-8 cells, so cell-edge pans still trigger a fresh fetch.
const BOUNDS_QUANTIZATION_DEGREES = 0.05;

function quantizeBoundsForFetch(bounds: { north: number; south: number; east: number; west: number }) {
  const g = BOUNDS_QUANTIZATION_DEGREES;
  return {
    north: Math.ceil(bounds.north / g) * g,
    south: Math.floor(bounds.south / g) * g,
    east: Math.ceil(bounds.east / g) * g,
    west: Math.floor(bounds.west / g) * g,
  };
}

function boundsCacheKey(bounds: { north: number; south: number; east: number; west: number }) {
  // Round to 6 decimals so floating-point noise from the quantize math
  // can't make two equivalent cells look different.
  return [bounds.north, bounds.south, bounds.east, bounds.west]
    .map((n) => n.toFixed(6))
    .join('|');
}

// Warm the Leaflet chunk download the moment THIS module is parsed, in parallel
// with React hydration, so the map-init effect's `await import('leaflet')`
// resolves from cache. Browser-only guard: Leaflet touches `window` at load.
if (typeof window !== 'undefined') {
  void import('leaflet');
}

// Module-level pins cache — survives navigation (component unmount/remount).
let _cachedPins: InfluencerMapPin[] | null = null;
let _pinsCacheExpiry = 0;
const PINS_CACHE_TTL = 5 * 60 * 1000;

let _cachedMemories: MemoryMapPin[] | null = null;
let _memoriesCacheExpiry = 0;
const MEMORIES_CACHE_TTL = 60 * 1000;
const LAYER_STORAGE_KEY = 'brooks.maps.layers';

// Upper bound on simultaneously-rendered creator HTML markers. Each marker is a
// DOM node plus a decoded avatar bitmap, so this directly caps the map's marker
// memory footprint on the Android WebView. Off-screen / lower-ranked creators
// are represented by the GL cluster layer instead. ~80 comfortably fills a
// zoomed-in viewport without approaching the WebView's bitmap budget.
const MAX_RENDERED_MARKERS = 80;
const MAX_RENDERED_MEMORY_MARKERS = 100;

interface MapsExperienceProps {
  mapboxToken: string;
  mapStyle: string;
  fallbackLatitude: number | null;
  fallbackLongitude: number | null;
  fallbackZoom: number | null;
}

type LocationState = 'locating' | 'current' | 'fallback' | 'unavailable';
type MapBoundsState = {
  north: number;
  south: number;
  east: number;
  west: number;
};

type MapFilterState = {
  countries: string[];
  cities: string[];
  regions: string[];
  verifiedStates: string[];
  priceBuckets: string[];
  dayBuckets: string[];
  placeBuckets: string[];
  followerBuckets: string[];
};

type MapLayerState = {
  memories: boolean;
  guides: boolean;
};

type FilterMenuKey = keyof MapFilterState | null;

type FilterChipProps = {
  label: string;
  activeCount: number;
  onClick: () => void;
  active: boolean;
};

type FilterSectionProps = {
  title: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  renderLabel?: (value: string) => string;
};

type SearchParamReader = {
  get: (key: string) => string | null;
};

type MemoryViewportSliceProps = {
  memory: MemoryMapPin;
  onSelect: (memory: MemoryMapPin) => void;
};

type SelectedMemoryCardProps = {
  memory: MemoryMapPin;
  token: string;
  onClose: () => void;
  onShare: (memoryId: string) => void;
  onDelete: (memoryId: string) => void;
  onRemove: (memoryId: string) => void;
  onReveal: (memory: MemoryMapPin) => void;
  busy: boolean;
};

const FILTER_PARAM_KEYS: Array<keyof MapFilterState> = [
  'countries',
  'cities',
  'regions',
  'verifiedStates',
  'priceBuckets',
  'dayBuckets',
  'placeBuckets',
  'followerBuckets',
];

const PRICE_BUCKET_LABELS: Record<string, string> = {
  free: 'Free',
  budget: '$1-$24',
  premium: '$25+',
};

const DAY_BUCKET_LABELS: Record<string, string> = {
  short: '1-3 days',
  medium: '4-7 days',
  long: '8+ days',
};

const PLACE_BUCKET_LABELS: Record<string, string> = {
  compact: '1-5 places',
  balanced: '6-10 places',
  full: '11+ places',
};

const FOLLOWER_BUCKET_LABELS: Record<string, string> = {
  emerging: 'Under 1k',
  growing: '1k-10k',
  established: '10k+',
};

const VERIFIED_LABELS: Record<string, string> = {
  verified: 'Verified',
  unverified: 'Unverified',
};

const DEFAULT_LAYERS: MapLayerState = {
  memories: true,
  guides: true,
};

interface SelectedPinCardProps {
  pin: InfluencerMapPin;
  onClose: () => void;
}

interface InfluencerViewportSliceProps {
  pin: InfluencerMapPin;
  onHoverStart: (userId: string) => void;
  onHoverEnd: () => void;
}

function getMarkerTransform(isActive: boolean): string {
  return isActive ? 'translateY(-4px) scale(1.04)' : 'translateY(0) scale(1)';
}

// Leaflet returns world-wrapped coordinates (e.g. east = 199 or 382) when the map is
// zoomed out far enough to show multiple world copies, or panned across the antimeridian.
// The /api/memories/map endpoint validates bounds are within [-180,180]/[-90,90] and 400s
// otherwise ("Invalid map bounds"). Clamp to the valid range so the fetch always succeeds —
// a fully zoomed-out viewport then queries the whole world, which is the intended result.
const clampLat = (v: number) => Math.max(-90, Math.min(90, v));
const clampLng = (v: number) => Math.max(-180, Math.min(180, v));

function getBoundsState(bounds: LatLngBounds): MapBoundsState {
  return {
    north: clampLat(bounds.getNorth()),
    south: clampLat(bounds.getSouth()),
    east: clampLng(bounds.getEast()),
    west: clampLng(bounds.getWest()),
  };
}

// Convert the mapbox style URL (mapbox://styles/<user>/<style>) the theme hook
// returns into a Mapbox *raster* tiles endpoint for Leaflet (512px @2x tiles).
// Raster tiles are plain <img> the WebView GCs normally — no WebGL textures.
function rasterTileUrl(themedStyle: string, token: string): string {
  const path = themedStyle.replace('mapbox://styles/', '').trim() || 'mapbox/dark-v11';
  return `https://api.mapbox.com/styles/v1/${path}/tiles/512/{z}/{x}/{y}@2x?access_token=${token}`;
}

function isPinWithinBounds(pin: InfluencerMapPin, bounds: MapBoundsState | null): boolean {
  if (!bounds) {
    return true;
  }

  const withinLatitude = pin.latitude >= bounds.south && pin.latitude <= bounds.north;
  const withinLongitude = bounds.west <= bounds.east
    ? pin.longitude >= bounds.west && pin.longitude <= bounds.east
    : pin.longitude >= bounds.west || pin.longitude <= bounds.east;

  return withinLatitude && withinLongitude;
}

function getMemoryPinAppearance(memory: MemoryMapPin): { background: string; glyph: string; ariaLabel: string } {
  if (memory.ownedByViewer) {
    return { background: '#ef2f6d', glyph: 'M', ariaLabel: 'Your memory' };
  }
  if (memory.sharedWithViewer) {
    return { background: '#b45309', glyph: '✦', ariaLabel: 'Memory shared with you' };
  }
  return { background: '#12c7c9', glyph: 'M', ariaLabel: 'Memory pin' };
}

/**
 * Haversine distance in meters between two lat/lng pairs. Used to sort
 * drawer memory list by proximity to the user — closest first. Drops
 * trig precision a touch (Earth-radius rounded to 6,371 km) but cheap
 * enough to run on every memory in the viewport without memoization.
 */
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Pretty-printed distance for the drawer's "closest" callout. */
function formatDistance(meters: number | null): string {
  if (meters === null) return '';
  if (meters < 1000) return `${Math.round(meters)} m away`;
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km away`;
}

function isMemoryWithinBounds(memory: MemoryMapPin, bounds: MapBoundsState | null): boolean {
  if (!bounds) {
    return true;
  }

  const withinLatitude = memory.latitude >= bounds.south && memory.latitude <= bounds.north;
  const withinLongitude = bounds.west <= bounds.east
    ? memory.longitude >= bounds.west && memory.longitude <= bounds.east
    : memory.longitude >= bounds.west || memory.longitude <= bounds.east;

  return withinLatitude && withinLongitude;
}

function parseLayerState(value: string | null): MapLayerState | null {
  if (!value) {
    return null;
  }

  const parts = value.split(',').map((part) => part.trim()).filter(Boolean);
  const next = {
    memories: parts.includes('memories'),
    guides: parts.includes('guides'),
  };

  return next.memories || next.guides ? next : null;
}

function serializeLayerState(layers: MapLayerState): string {
  return [
    layers.memories ? 'memories' : null,
    layers.guides ? 'guides' : null,
  ].filter(Boolean).join(',');
}

function layerLabel(layers: MapLayerState): string {
  if (layers.memories && layers.guides) return 'Memories + guides';
  if (layers.memories) return 'Memories';
  return 'Guides';
}

function parseFilterValues(searchParams: SearchParamReader, key: keyof MapFilterState): string[] {
  const value = searchParams.get(key);
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((part: string) => decodeURIComponent(part).trim())
    .filter(Boolean);
}

function buildFilterState(searchParams: SearchParamReader): MapFilterState {
  return {
    countries: parseFilterValues(searchParams, 'countries'),
    cities: parseFilterValues(searchParams, 'cities'),
    regions: parseFilterValues(searchParams, 'regions'),
    verifiedStates: parseFilterValues(searchParams, 'verifiedStates'),
    priceBuckets: parseFilterValues(searchParams, 'priceBuckets'),
    dayBuckets: parseFilterValues(searchParams, 'dayBuckets'),
    placeBuckets: parseFilterValues(searchParams, 'placeBuckets'),
    followerBuckets: parseFilterValues(searchParams, 'followerBuckets'),
  };
}

function buildUniqueOptions(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value && value.trim())).map((value) => value.trim())))
    .sort((left, right) => left.localeCompare(right));
}

function formatPriceBucket(bucket: string): string {
  return PRICE_BUCKET_LABELS[bucket] ?? bucket;
}

function formatRangeBucket(bucket: string, labels: Record<string, string>): string {
  return labels[bucket] ?? bucket;
}

function matchesPriceBucket(priceCents: number | null, bucket: string): boolean {
  const normalizedPrice = priceCents ?? 0;

  switch (bucket) {
    case 'free':
      return normalizedPrice === 0;
    case 'budget':
      return normalizedPrice > 0 && normalizedPrice < 2500;
    case 'premium':
      return normalizedPrice >= 2500;
    default:
      return true;
  }
}

function matchesDayBucket(dayCount: number | null, bucket: string): boolean {
  const normalizedDayCount = dayCount ?? 0;

  switch (bucket) {
    case 'short':
      return normalizedDayCount >= 1 && normalizedDayCount <= 3;
    case 'medium':
      return normalizedDayCount >= 4 && normalizedDayCount <= 7;
    case 'long':
      return normalizedDayCount >= 8;
    default:
      return true;
  }
}

function matchesPlaceBucket(placeCount: number | null, bucket: string): boolean {
  const normalizedPlaceCount = placeCount ?? 0;

  switch (bucket) {
    case 'compact':
      return normalizedPlaceCount >= 1 && normalizedPlaceCount <= 5;
    case 'balanced':
      return normalizedPlaceCount >= 6 && normalizedPlaceCount <= 10;
    case 'full':
      return normalizedPlaceCount >= 11;
    default:
      return true;
  }
}

function matchesFollowerBucket(followerCount: number, bucket: string): boolean {
  switch (bucket) {
    case 'emerging':
      return followerCount < 1000;
    case 'growing':
      return followerCount >= 1000 && followerCount < 10000;
    case 'established':
      return followerCount >= 10000;
    default:
      return true;
  }
}

function matchesMapFilters(pin: InfluencerMapPin, filters: MapFilterState): boolean {
  const matchesCategory =
    (filters.countries.length === 0 || (pin.guideCountry !== null && filters.countries.includes(pin.guideCountry))) &&
    (filters.cities.length === 0 || (pin.guidePrimaryCity !== null && filters.cities.includes(pin.guidePrimaryCity))) &&
    (filters.regions.length === 0 || (pin.region !== null && filters.regions.includes(pin.region)));

  const matchesVerified =
    filters.verifiedStates.length === 0 ||
    filters.verifiedStates.some((state) => (state === 'verified' ? pin.verified : !pin.verified));

  const matchesNumeric =
    (filters.priceBuckets.length === 0 || filters.priceBuckets.some((bucket) => matchesPriceBucket(pin.guidePriceCents, bucket))) &&
    (filters.dayBuckets.length === 0 || filters.dayBuckets.some((bucket) => matchesDayBucket(pin.guideDayCount, bucket))) &&
    (filters.placeBuckets.length === 0 || filters.placeBuckets.some((bucket) => matchesPlaceBucket(pin.guidePlaceCount, bucket))) &&
    (filters.followerBuckets.length === 0 || filters.followerBuckets.some((bucket) => matchesFollowerBucket(pin.followerCount, bucket)));

  return matchesCategory && matchesVerified && matchesNumeric;
}

function getActiveFilterCount(filters: MapFilterState): number {
  return FILTER_PARAM_KEYS.reduce((count, key) => count + filters[key].length, 0);
}

function FilterChip({ label, activeCount, onClick, active }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition lg:min-h-0 lg:px-3 lg:py-1.5 lg:text-xs ${
        active || activeCount > 0
          ? 'border-brand-500/30 bg-brand-500/10 text-brand-600'
          : 'border-ig-border bg-ig-primary/80 text-ig-text-secondary hover:border-brand-500/20 hover:text-ig-text-primary'
      }`}
    >
      {label}
      {activeCount > 0 ? ` (${activeCount})` : ''}
    </button>
  );
}

function FilterSection({ title, options, selected, onToggle, renderLabel }: FilterSectionProps) {
  if (options.length === 0) {
    return null;
  }

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ig-text-tertiary">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selected.includes(option);

              return (
            <button
              key={option}
              type="button"
              onClick={() => onToggle(option)}
              className={`min-h-11 rounded-full border px-4 py-2 text-sm transition lg:min-h-0 lg:px-3 lg:py-1.5 lg:text-xs ${
                isSelected
                  ? 'border-brand-500/30 bg-brand-500/10 text-brand-600'
                  : 'border-ig-border bg-ig-primary text-ig-text-secondary hover:text-ig-text-primary'
              }`}
            >
              {renderLabel ? renderLabel(option) : option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function InfluencerViewportSlice({ pin, onHoverStart, onHoverEnd }: InfluencerViewportSliceProps) {
  const guideMeta = [pin.guidePrimaryCity || pin.region, pin.guideCountry].filter(Boolean).join(' · ');
  const guideStats = [
    pin.guideDayCount !== null ? `${pin.guideDayCount} days` : null,
    pin.guidePlaceCount !== null ? `${pin.guidePlaceCount} places` : null,
  ].filter(Boolean).join(' · ');

  const detailLine = [guideMeta, guideStats].filter(Boolean).join(' · ');

  return (
    <div
      className="flex items-center gap-3 rounded-full border border-ig-border bg-ig-primary px-3 py-2 shadow-[0_8px_21px_rgba(15,23,42,0.08)] transition-transform duration-150 hover:-translate-y-0.5"
      onMouseEnter={() => onHoverStart(pin.userId)}
      onMouseLeave={onHoverEnd}
    >
      <div className="min-w-0 flex-1">
        {pin.guideId && pin.guideTitle ? (
          <Link
            href={`/guides/${pin.guideId}/view`}
            className="block truncate text-[13px] font-semibold text-ig-text-primary transition hover:text-brand-500"
          >
            {pin.guideTitle}
          </Link>
        ) : (
          <p className="truncate text-[13px] font-semibold text-ig-text-primary">Published guide</p>
        )}
        {pin.creatorRatingAverage > 0 && (
          <div className="mt-1 flex items-center gap-1.5">
            <StarRating rating={pin.creatorRatingAverage} size="sm" />
            <span className="text-[11px] text-ig-text-tertiary">{pin.creatorRatingAverage.toFixed(1)}</span>
          </div>
        )}
        <p className="mt-1 truncate text-[11px] leading-4 text-ig-text-tertiary">
          {detailLine || `${pin.followerCount} followers`}
        </p>
      </div>
      <Link
        href={`/creators/${pin.username}`}
        className="block h-[34px] w-[34px] shrink-0 overflow-hidden rounded-full border border-white/90 bg-ig-secondary shadow-[0_0_0_2px_var(--brand-primary)]"
        aria-label={`Open ${pin.displayName} profile`}
      >
        {pin.avatarUrl ? (
          <img src={pin.avatarUrl} alt={pin.displayName} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-ig-text-secondary">
            {pin.displayName.charAt(0).toUpperCase()}
          </div>
        )}
      </Link>
    </div>
  );
}

function MemoryViewportSlice({ memory, onSelect }: MemoryViewportSliceProps) {
  const visibilityLabel = memory.visibility === 'FOLLOWERS_PUBLIC'
    ? 'Followers'
    : memory.visibility === 'SHARED_LINK'
      ? 'Shared'
      : 'Private';

  return (
    <button
      type="button"
      onClick={() => onSelect(memory)}
      className="flex w-full items-center gap-3 rounded-[24px] border border-ig-border bg-ig-primary px-3 py-2 text-left shadow-[0_8px_21px_rgba(15,23,42,0.08)] transition-transform duration-150 hover:-translate-y-0.5"
    >
      <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-black text-white shadow-[0_0_0_2px_rgba(255,255,255,0.9)]">
        M
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-ig-text-primary">{memory.textPreview ?? '🔒 Hidden — go there to unlock'}</p>
        <p className="mt-1 truncate text-[11px] leading-4 text-ig-text-tertiary">
          {memory.placeLabel || `By ${memory.creatorDisplayName}`} · {visibilityLabel}
          {memory.hasAudio ? ' · Audio' : ''}
          {memory.hasImage ? ' · Photo' : ''}
        </p>
      </div>
    </button>
  );
}

// Max reply nesting surfaced in the UI: original (level 0) → reply (1) → reply-back (2).
const MAX_REPLY_DEPTH = 2;

// Recursive linked-reply thread inside a revealed memory card. Depth 1 = replies to the original
// (the recipient adds here); depth 2 = replies to each reply (the original author replies back).
// The backend enforces the true gate; the UI shows a composer to the likely participants of an
// edge (the parent's owner, or the reply's own author).
function MemoryReplies({
  parentId,
  parentOwnedByViewer,
  canReplyToParent,
  token,
  depth = 1,
}: {
  parentId: string;
  parentOwnedByViewer: boolean;
  canReplyToParent: boolean;
  token: string;
  depth?: number;
}) {
  const [replies, setReplies] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setReplies(await api.get<Memory[]>(`/api/memories/${parentId}/replies`, token));
    } catch {
      /* not fatal to the card */
    } finally {
      setLoading(false);
    }
  }, [parentId, token]);

  useEffect(() => { void load(); }, [load]);

  const submit = async () => {
    const body = text.trim();
    if (!body || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/api/memories/${parentId}/replies`, { textContent: body }, token);
      setText('');
      setOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add your memory');
    } finally {
      setSubmitting(false);
    }
  };

  const addLabel = depth === 1 ? 'Add a Memory' : 'Reply';

  return (
    <div className={depth === 1 ? 'mt-4 border-t border-ig-border pt-3' : 'mt-2 border-l-2 border-ig-border pl-3'}>
      {depth === 1 && (
        <p className="text-xs font-semibold uppercase tracking-wide text-ig-text-tertiary">
          Linked memories{replies.length > 0 ? ` (${replies.length})` : ''}
        </p>
      )}
      {loading && depth === 1 ? (
        <p className="mt-2 text-sm text-ig-text-tertiary">Loading…</p>
      ) : replies.length === 0 && depth === 1 ? (
        <p className="mt-2 text-sm text-ig-text-tertiary">No memories added here yet.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {replies.map((r) => (
            <li key={r.id} className="rounded-lg border border-ig-border bg-ig-secondary/40 p-2.5">
              <p className="text-sm text-ig-text-primary">{r.textContent}</p>
              <p className="mt-1 text-xs text-ig-text-tertiary">
                by {r.creatorDisplayName || r.creatorUsername || 'Brooks user'}
              </p>
              {depth < MAX_REPLY_DEPTH && (
                <MemoryReplies
                  parentId={r.id}
                  parentOwnedByViewer={r.ownedByViewer}
                  canReplyToParent={parentOwnedByViewer || r.ownedByViewer}
                  token={token}
                  depth={depth + 1}
                />
              )}
            </li>
          ))}
        </ul>
      )}
      {canReplyToParent && (open ? (
        <div className="mt-3 space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder={depth === 1 ? 'Add your memory at this spot…' : 'Reply…'}
            className="w-full resize-none rounded-md border border-ig-border bg-ig-secondary px-3 py-2 text-sm text-ig-text-primary focus:border-ig-blue focus:outline-none"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={submitting || !text.trim()}
              onClick={submit}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitting && <Spinner />}
              {addLabel}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setText(''); }}
              className="min-h-11 rounded-md border border-ig-border px-4 py-2 text-sm font-semibold text-ig-text-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`mt-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold ${
            depth === 1 ? 'bg-brand-500 text-white' : 'border border-ig-border text-brand-500'
          }`}
        >
          {depth === 1 && <span aria-hidden>✨</span>} {addLabel}
        </button>
      ))}
    </div>
  );
}

function SelectedMemoryCard({ memory, token, onClose, onShare, onDelete, onRemove, onReveal, busy }: SelectedMemoryCardProps) {
  // A share the viewer hasn't reached yet: contents are withheld by the server
  // (textPreview is null). Show a locked teaser that points them to the spot.
  const locked = memory.sharedWithViewer && !memory.ownedByViewer && !memory.revealed;
  return (
    <div className="absolute inset-x-3 bottom-12 z-30 mx-auto max-h-[calc(100dvh_-_9rem)] max-w-md overflow-y-auto rounded-2xl border border-ig-border bg-ig-elevated p-4 shadow-2xl md:bottom-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-brand-500">
            {locked ? 'Shared with you · Locked' : memory.sharedWithViewer ? 'Shared with you' : 'Memory pin'}
          </p>
          <h2 className="mt-1 text-base font-semibold text-ig-text-primary">
            {locked ? '🔒 Hidden until you arrive' : memory.textPreview}
          </h2>
          <p className="mt-2 text-sm text-ig-text-secondary">
            {memory.placeLabel || 'Hidden at this location'} · by {memory.creatorDisplayName}
          </p>
          {locked && (
            <p className="mt-2 text-sm text-ig-text-tertiary">
              Go to this location to unlock the message{memory.hasImage || memory.hasAudio ? ' and media' : ''}.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-ig-text-tertiary">
            <span className="rounded-pill border border-ig-border px-2 py-1">{memory.visibility}</span>
            {memory.hasImage && <span className="rounded-pill border border-ig-border px-2 py-1">Photo</span>}
            {memory.hasAudio && <span className="rounded-pill border border-ig-border px-2 py-1">Audio</span>}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-full px-3 text-sm text-ig-text-tertiary transition-colors hover:bg-ig-hover hover:text-ig-text-primary"
        >
          Close
        </button>
      </div>
      {memory.ownedByViewer && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => onShare(memory.id)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
          >
            {busy && <Spinner />}
            Share
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onDelete(memory.id)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-ig-border px-4 py-2 text-sm font-semibold text-ig-text-secondary transition-colors hover:bg-ig-hover hover:text-ig-text-primary disabled:opacity-60"
          >
            {busy && <Spinner />}
            Delete
          </button>
        </div>
      )}
      {memory.sharedWithViewer && !memory.ownedByViewer && (
        <div className="mt-4 flex flex-wrap gap-2">
          {locked && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onReveal(memory)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
            >
              {busy && <Spinner />}
              Unlock here
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => onRemove(memory.id)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-ig-border px-4 py-2 text-sm font-semibold text-ig-text-secondary transition-colors hover:bg-ig-hover hover:text-ig-text-primary disabled:opacity-60"
          >
            {busy && <Spinner />}
            Remove from my map
          </button>
        </div>
      )}
      {/* Linked replies + "Add a Memory" — only once the memory's content is visible
          (owner always; a recipient after they unlock it on-site). */}
      {memory.revealed && token && (
        <MemoryReplies
          parentId={memory.id}
          parentOwnedByViewer={memory.ownedByViewer}
          canReplyToParent={memory.sharedWithViewer && !memory.ownedByViewer}
          token={token}
        />
      )}
    </div>
  );
}

function SelectedPinCard({ pin, onClose }: SelectedPinCardProps) {
  return (
    <div className="absolute inset-x-3 bottom-12 z-30 mx-auto max-h-[calc(100dvh_-_9rem)] max-w-md overflow-y-auto rounded-2xl border border-ig-border bg-ig-elevated p-4 shadow-2xl md:bottom-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <div className="h-14 w-14 overflow-hidden rounded-full border border-white/90 bg-ig-secondary shadow-[0_0_0_2px_var(--brand-primary)]">
            {pin.avatarUrl ? (
              <img src={pin.avatarUrl} alt={pin.displayName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-ig-hover text-lg font-semibold text-ig-text-secondary">
                {pin.displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-base font-semibold text-ig-text-primary">{pin.displayName}</p>
              {pin.rank <= 3 && (
                <span className="rounded-pill bg-brand-500/20 px-2 py-0.5 text-xs font-semibold text-brand-500">
                  Top {pin.rank}
                </span>
              )}
            </div>
            <p className="text-sm text-ig-text-tertiary">@{pin.username}</p>
            {pin.region && <p className="mt-1 text-sm text-ig-text-secondary">{pin.region}</p>}
            {pin.bio && <p className="mt-2 text-sm text-ig-text-secondary">{pin.bio}</p>}
            <div className="mt-3 flex items-center gap-4 text-xs text-ig-text-tertiary">
              <span>{pin.followerCount} followers</span>
              <span>{pin.guideCount} guides</span>
              {pin.creatorRatingAverage > 0 && <span>{pin.creatorRatingAverage.toFixed(1)} stars</span>}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-full px-3 text-sm text-ig-text-tertiary transition-colors hover:bg-ig-hover hover:text-ig-text-primary"
          aria-label="Close influencer details"
        >
          Close
        </button>
      </div>
      <div className="mt-4">
        <Link
          href={`/creators/${pin.username}`}
          className="inline-flex min-h-11 items-center rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
        >
          Open profile
        </Link>
      </div>
    </div>
  );
}

export default function MapsExperience({
  mapboxToken,
  mapStyle,
  fallbackLatitude,
  fallbackLongitude,
  fallbackZoom,
}: MapsExperienceProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, loading: tokenLoading, error: tokenError } = useAccessToken();
  const themedStyle = useMapboxStyle();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const tileLayerRef = useRef<TileLayer | null>(null);
  const clusterGroupRef = useRef<MarkerClusterGroup | null>(null);
  const memoryLayerRef = useRef<LayerGroup | null>(null);
  const markersRef = useRef<LeafletMarker[]>([]);
  const markersMapRef = useRef<Map<string, LeafletMarker>>(new Map());
  const markerElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const memoryMarkersRef = useRef<LeafletMarker[]>([]);
  const memoryMarkersMapRef = useRef<Map<string, LeafletMarker>>(new Map());
  const userLocationMarkerRef = useRef<LeafletMarker | null>(null);
  // Tracks the style URL currently applied to the map so we don't re-call
  // setStyle on the first mapReady event (the map already initialized with
  // this style; calling setStyle again would needlessly reload tiles).
  const lastAppliedStyleRef = useRef<string | null>(null);

  const [pins, setPins] = useState<InfluencerMapPin[]>(
    () => (_cachedPins && Date.now() < _pinsCacheExpiry ? _cachedPins : [])
  );
  const [memories, setMemories] = useState<MemoryMapPin[]>(
    () => (_cachedMemories && Date.now() < _memoriesCacheExpiry ? _cachedMemories : [])
  );
  const [pinsLoading, setPinsLoading] = useState(
    !(_cachedPins && Date.now() < _pinsCacheExpiry)
  );
  const [memoriesLoading, setMemoriesLoading] = useState(
    !(_cachedMemories && Date.now() < _memoriesCacheExpiry)
  );
  const [pageError, setPageError] = useState<string | null>(null);
  const [selectedPin, setSelectedPin] = useState<InfluencerMapPin | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<MemoryMapPin | null>(null);
  const [locationState, setLocationState] = useState<LocationState>('locating');
  const [userCoordinates, setUserCoordinates] = useState<LngLat | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [currentBounds, setCurrentBounds] = useState<MapBoundsState | null>(null);
  const [hoveredSlicePinId, setHoveredSlicePinId] = useState<string | null>(null);
  const [hoveredMarkerPinId, setHoveredMarkerPinId] = useState<string | null>(null);
  const [openFilterMenu, setOpenFilterMenu] = useState<FilterMenuKey>(null);
  // Slides the right-side drawer holding layers + filters + viewport list.
  // Replaces the old bottom-anchored panel + mobilePanelOpen state — May 2026
  // redesign per user's three-zone direction: bottom CTA + top-right hamburger
  // + drawer + full-screen composer modal.
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Curated-list state — show the first N memories in the drawer, hide
  // the rest behind a "Show all" tap. Reduces overwhelm + frames the
  // list as discovery rather than a feed. Resets on drawer close so each
  // session feels fresh.
  const [drawerShowAllMemories, setDrawerShowAllMemories] = useState(false);
  useEffect(() => {
    if (!drawerOpen) setDrawerShowAllMemories(false);
  }, [drawerOpen]);
  const { currentStep, isActive: tourActive } = useOnboarding();

  // Auto-close the drawer whenever a memory becomes selected. The selected
  // memory card renders at bottom-12; the right-slide drawer would otherwise
  // cover it, hiding the card the user just asked to see. Handles every
  // selection path uniformly (tap from drawer list, tap a pin on the map,
  // programmatic selection) without needing setDrawerOpen calls scattered
  // through every onSelect handler. We don't reopen on close — clean map
  // is the expected UX, per user spec.
  useEffect(() => {
    if (selectedMemory) setDrawerOpen(false);
  }, [selectedMemory]);

  // Onboarding tour wiring. Match on step.id (kind-agnostic so the same logic survives
  // future centered/spotlight refactors).
  useEffect(() => {
    if (!tourActive || !currentStep) return;
    const stepId = (currentStep as { id?: string }).id;
    if (stepId === 'memory-drawer-trigger') {
      // Highlight the hamburger BEFORE the drawer opens — close the drawer
      // and the composer so nothing covers the trigger button.
      setDrawerOpen(false);
      setCreateMemoryOpen(false);
      return;
    }
    if (stepId === 'memory-intro') {
      // Slide the drawer in. The user SEES the drawer open inside the
      // spotlight cutout — confirming the action they were shown previously.
      setDrawerOpen(false);
      const open = setTimeout(() => setDrawerOpen(true), 700);
      return () => clearTimeout(open);
    }
    if (stepId === 'memory-button') {
      // Highlight the "+ Create a memory" pill BEFORE the composer opens —
      // close the drawer and the composer so the pill is unobscured.
      setDrawerOpen(false);
      setCreateMemoryOpen(false);
      return;
    }
    if (stepId === 'memory-form') {
      // Open the full-screen composer modal.
      setCreateMemoryOpen(true);
      return;
    }
  }, [tourActive, currentStep]);
  const [activeLayers, setActiveLayers] = useState<MapLayerState>(DEFAULT_LAYERS);
  const [createMemoryOpen, setCreateMemoryOpen] = useState(false);
  const [memoryText, setMemoryText] = useState('');
  const [memoryPlaceLabel, setMemoryPlaceLabel] = useState('');
  const [memoryVisibility, setMemoryVisibility] = useState<MemoryVisibility>('SHARED_LINK');
  const [memoryPhoto, setMemoryPhoto] = useState<MemoryMediaRequest | null>(null);
  const [memoryAudio, setMemoryAudio] = useState<MemoryMediaRequest | null>(null);
  const [memoryBusy, setMemoryBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  // Memory share mode: 'link' = current behavior (token URL after save),
  // 'follower' = direct in-app share to a follower (no link).
  const [shareMode, setShareMode] = useState<'link' | 'follower'>('link');
  const [followers, setFollowers] = useState<Array<{ userId: string; username: string | null; displayName: string; avatarUrl: string | null }>>([]);
  const [followersLoading, setFollowersLoading] = useState(false);
  const [followersFetched, setFollowersFetched] = useState(false);
  const [selectedFollowerId, setSelectedFollowerId] = useState<string>('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);

  // Fetch followers when the composer opens AND share mode is 'follower'.
  // Keeps the network call lazy so users who only ever share via link
  // never hit the endpoint.
  useEffect(() => {
    if (!createMemoryOpen || shareMode !== 'follower' || !token) return;
    if (followersFetched) return;
    setFollowersLoading(true);
    api.get<typeof followers>('/api/me/followers', token)
      .then((data) => {
        console.info('[memory] followers fetched:', data?.length ?? 0);
        setFollowers(data ?? []);
        setFollowersFetched(true);
      })
      .catch((err) => {
        console.error('[memory] follower fetch failed:', err);
        setPageError('Could not load your followers. Try again or use the link mode.');
      })
      .finally(() => setFollowersLoading(false));
  }, [createMemoryOpen, shareMode, token, followersFetched]);

  const mapConfigured = Boolean(
    mapboxToken &&
    themedStyle &&
    fallbackLatitude !== null &&
    fallbackLongitude !== null &&
    fallbackZoom !== null,
  );

  const fallbackCenter = useMemo<LngLat | null>(() => {
    if (fallbackLatitude === null || fallbackLongitude === null) {
      return null;
    }
    return [fallbackLongitude, fallbackLatitude];
  }, [fallbackLatitude, fallbackLongitude]);

  const searchQuery = useMemo(() => (searchParams.get('q') ?? '').trim(), [searchParams]);
  const activeFilters = useMemo(() => buildFilterState(searchParams), [searchParams]);
  const activeFilterCount = useMemo(() => getActiveFilterCount(activeFilters), [activeFilters]);

  const countryOptions = useMemo(() => buildUniqueOptions(pins.map((pin) => pin.guideCountry)), [pins]);
  const cityOptions = useMemo(() => buildUniqueOptions(pins.map((pin) => pin.guidePrimaryCity)), [pins]);
  const regionOptions = useMemo(() => buildUniqueOptions(pins.map((pin) => pin.region)), [pins]);

  const searchFilteredPins = useMemo(() => {
    if (!searchQuery) {
      return pins;
    }

    const scoredPins = pins
      .map((pin) => ({
        pin,
        score: scoreSearchMatch(searchQuery, [
          pin.displayName,
          pin.username,
          pin.region,
          pin.bio,
        ]),
      }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score || left.pin.rank - right.pin.rank);

    return scoredPins.length > 0 ? scoredPins.map((entry) => entry.pin) : pins;
  }, [pins, searchQuery]);

  const hasDirectPinMatches = useMemo(() => {
    if (!searchQuery) {
      return true;
    }

    return searchFilteredPins.length !== pins.length || pins.length === 0;
  }, [searchFilteredPins.length, pins.length, searchQuery]);

  const filteredPins = useMemo(() => {
    return searchFilteredPins.filter((pin) => matchesMapFilters(pin, activeFilters));
  }, [activeFilters, searchFilteredPins]);

  const visibleGuidePins = useMemo(() => (activeLayers.guides ? filteredPins : []), [activeLayers.guides, filteredPins]);
  const visibleMemories = useMemo(() => (activeLayers.memories ? memories : []), [activeLayers.memories, memories]);

  const viewportPins = useMemo(() => {
    return visibleGuidePins.filter((pin) => isPinWithinBounds(pin, currentBounds));
  }, [currentBounds, visibleGuidePins]);

  // Pins that actually get a DOM marker + avatar <img>. Bounded two ways so the
  // Android WebView never accumulates an unbounded set of decoded bitmaps:
  //   1. viewport-filtered (off-screen creators get no marker), and
  //   2. hard-capped to the top-ranked MAX_RENDERED_MARKERS within the viewport.
  // At low zoom a wide viewport can still contain hundreds of pins; the cluster
  // layer represents those, so we only ever materialise the strongest few as
  // HTML markers. pins arrive rank-sorted from the API, so a prefix is the
  // top-ranked slice.
  const viewportMarkerPins = useMemo(
    () => viewportPins.slice(0, MAX_RENDERED_MARKERS),
    [viewportPins],
  );

  const viewportMemories = useMemo(() => {
    return visibleMemories.filter((memory) => isMemoryWithinBounds(memory, currentBounds));
  }, [currentBounds, visibleMemories]);

  // Memory markers actually rendered to the map: scoped to the current viewport
  // AND hard-capped, so a dense area can't mount hundreds of DOM markers (the LMK
  // trigger). `viewportMemories` (uncapped) still backs the list counts.
  const viewportMemoryPins = useMemo(
    () => viewportMemories.slice(0, MAX_RENDERED_MEMORY_MARKERS),
    [viewportMemories],
  );

  // Sorted-and-scored viewport memories for the drawer list. Density
  // intelligence: closest first, then "shared with me" boost, then
  // "has rich media" boost. Distance computed via haversine when the
  // user's coordinates are known; falls back to original order otherwise.
  const sortedViewportMemories = useMemo(() => {
    if (!userCoordinates || !Array.isArray(userCoordinates)) {
      return viewportMemories.map((m) => ({ memory: m, distanceMeters: null as number | null }));
    }
    const [userLng, userLat] = userCoordinates as [number, number];
    return viewportMemories
      .map((m) => ({
        memory: m,
        distanceMeters: haversineMeters(userLat, userLng, m.latitude, m.longitude),
      }))
      .sort((a, b) => {
        // Closest first. Friend-shared (sharedWithViewer) gets a virtual
        // 50-meter pull. Media-rich memories nudge ahead by 25m.
        const aBoost = (a.memory.sharedWithViewer ? 50 : 0) + (a.memory.hasImage || a.memory.hasAudio ? 25 : 0);
        const bBoost = (b.memory.sharedWithViewer ? 50 : 0) + (b.memory.hasImage || b.memory.hasAudio ? 25 : 0);
        return ((a.distanceMeters ?? Infinity) - aBoost) - ((b.distanceMeters ?? Infinity) - bBoost);
      });
  }, [viewportMemories, userCoordinates]);

  useEffect(() => {
    if (!tokenLoading && !token) {
      // Native must use the Capacitor deep-link universal-login flow
      // (/login -> startAuthFlow). /api/auth/login is the web Auth0 SDK server
      // route and fails inside the WebView (CORS + missing state cookie -> 400).
      router.push(isNative() ? '/login' : '/api/auth/login');
    }
  }, [router, token, tokenLoading]);

  // Foreground proximity notifier. Watches the user's location while they're
  // on /maps and fires an in-app banner when they cross from outside →
  // inside 100 m of a memory that's been directly shared with them.
  // Dedupes per-memory per-calendar-day. No new permissions; uses the
  // location grant already in place. Background detection (phone in pocket)
  // is intentionally v2 — would need @capacitor-community/background-
  // geolocation + ACCESS_BACKGROUND_LOCATION permission.
  //
  // Activation is gated on `mapReady` AND a 3-second post-mount delay
  // so we DON'T start a second GPS subscriber while Mapbox is doing its
  // first tile cycle + initial memory marker render. Logs from 2026-05-22
  // showed watchPosition firing during peak renderer memory pressure,
  // followed ~4s later by an OOM kill. Delaying past the busy window
  // gives the renderer time to settle before adding native GPS work.
  const [proximityArmed, setProximityArmed] = useState(false);
  useEffect(() => {
    if (!mapReady) return;
    const timer = setTimeout(() => setProximityArmed(true), 3000);
    return () => clearTimeout(timer);
  }, [mapReady]);
  // Gate ONLY on stable booleans (armed + token). Deliberately NOT on
  // memories.length: panning into/out of empty areas flips memories to []
  // and back, which would tear down and restart the geolocation watcher on
  // every cell change. Each restart is another chance to hit the async
  // watchPosition leak — so we keep the watcher steady once armed and let
  // its callback read the live memories list via memoriesRef. With zero
  // shared memories the watcher simply fires nothing (cheap).
  useProximityNotifier({
    enabled: proximityArmed && Boolean(token),
    memories,
  });

  useEffect(() => {
    const fromUrl = parseLayerState(searchParams.get('layers'));
    if (fromUrl) {
      setActiveLayers(fromUrl);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(LAYER_STORAGE_KEY, serializeLayerState(fromUrl));
      }
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const fromStorage = parseLayerState(window.localStorage.getItem(LAYER_STORAGE_KEY));
    if (fromStorage) {
      setActiveLayers(fromStorage);
    }
  }, [searchParams]);

  const updateLayerState = (nextLayers: MapLayerState) => {
    const normalized = nextLayers.memories || nextLayers.guides ? nextLayers : activeLayers;
    setActiveLayers(normalized);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LAYER_STORAGE_KEY, serializeLayerState(normalized));
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    const serialized = serializeLayerState(normalized);
    if (serialized === serializeLayerState(DEFAULT_LAYERS)) {
      nextParams.delete('layers');
    } else {
      nextParams.set('layers', serialized);
    }
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  };

  const toggleLayer = (layer: keyof MapLayerState) => {
    const nextLayers = { ...activeLayers, [layer]: !activeLayers[layer] };
    if (!nextLayers.memories && !nextLayers.guides) {
      return;
    }
    updateLayerState(nextLayers);
  };

  const updateFilterValues = (key: keyof MapFilterState, values: string[]) => {
    const nextParams = new URLSearchParams(searchParams.toString());

    if (values.length === 0) {
      nextParams.delete(key);
    } else {
      nextParams.set(key, values.join(','));
    }

    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  };

  const toggleFilterValue = (key: keyof MapFilterState, value: string) => {
    const nextValues = activeFilters[key].includes(value)
      ? activeFilters[key].filter((currentValue) => currentValue !== value)
      : [...activeFilters[key], value];

    updateFilterValues(key, nextValues);
  };

  const clearAllFilters = () => {
    const nextParams = new URLSearchParams(searchParams.toString());
    FILTER_PARAM_KEYS.forEach((key) => nextParams.delete(key));
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    setOpenFilterMenu(null);
  };

  const uploadMemoryFile = async (file: File, mediaType: 'IMAGE' | 'AUDIO'): Promise<MemoryMediaRequest> => {
    if (!token) {
      throw new Error('Sign in is required');
    }
    const upload: MediaUploadResponse = await api.uploadMedia(
      file,
      mediaType === 'IMAGE' ? 'MEMORY_IMAGE' : 'MEMORY_AUDIO',
      token,
    );
    return {
      mediaType,
      url: upload.url,
      objectName: upload.objectName,
      contentType: upload.contentType,
      sizeBytes: upload.sizeBytes,
    };
  };

  const handlePhotoSelected = async (file: File | null) => {
    if (!file) {
      return;
    }
    setMemoryBusy(true);
    try {
      setMemoryPhoto(await uploadMemoryFile(file, 'IMAGE'));
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Photo upload failed');
    } finally {
      setMemoryBusy(false);
    }
  };

  const handleAudioSelected = async (file: File | null) => {
    if (!file) {
      return;
    }
    setMemoryBusy(true);
    try {
      setMemoryAudio(await uploadMemoryFile(file, 'AUDIO'));
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Audio upload failed');
    } finally {
      setMemoryBusy(false);
    }
  };

  const startRecording = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      setPageError('Audio recording is not available in this browser');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordedChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const file = new File([blob], `memory-${Date.now()}.webm`, { type: blob.type || 'audio/webm' });
        await handleAudioSelected(file);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setPageError('Microphone permission is required to record a memory');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
  };

  const handleCreateMemory = async () => {
    // Specific pre-checks so the user knows EXACTLY what's missing rather
    // than getting a generic "could not create memory" toast. Capacitor on
    // Android can silently fail any of these without the user realizing
    // why — explicit messages here turn the support back-and-forth into
    // a one-step fix.
    if (!token) {
      setPageError('Please sign in again — your session has expired.');
      console.error('[memory] save blocked: missing auth token');
      return;
    }
    if (!userCoordinates || !Array.isArray(userCoordinates)) {
      setPageError('Location permission needed. Enable Location in Settings → Apps → Brooks.');
      console.error('[memory] save blocked: missing geolocation');
      return;
    }
    const trimmedText = memoryText.trim();
    if (!trimmedText) {
      setPageError('Memory text is required');
      return;
    }

    // Optimistic pin: drop it on the map BEFORE we hear back from the
    // server. This is the top-100-app "instant" pattern — every write
    // feels free. On server success, refreshMemories reconciles. On
    // failure, we filter the optimistic pin out below.
    const optimisticId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimisticPin: MemoryMapPin = {
      id: optimisticId,
      creatorId: 'me',
      creatorUsername: null,
      creatorDisplayName: 'You',
      creatorAvatarUrl: null,
      textPreview: trimmedText.slice(0, 200),
      latitude: userCoordinates[1],
      longitude: userCoordinates[0],
      placeLabel: memoryPlaceLabel.trim() || null,
      visibility: memoryVisibility,
      ownedByViewer: true,
      sharedWithViewer: false,
      revealed: true, // own memory — always visible to its creator
      hasImage: !!memoryPhoto,
      hasAudio: !!memoryAudio,
      createdAt: new Date().toISOString(),
    };

    // Snapshot the form values BEFORE we reset state, so the background
    // POST sees the user's actual input even though the UI has moved on.
    const snapshot = {
      text: trimmedText,
      placeLabel: memoryPlaceLabel.trim() || undefined,
      visibility: memoryVisibility,
      media: [memoryPhoto, memoryAudio].filter(
        (item): item is MemoryMediaRequest => Boolean(item),
      ),
      latitude: userCoordinates[1],
      longitude: userCoordinates[0],
    };

    // Snapshot share mode + selected follower so the background call uses
    // the right values even if the UI moves on while POSTs are in flight.
    const sharePath: 'link' | 'follower' = shareMode;
    const followerRecipientId = sharePath === 'follower' ? selectedFollowerId : '';

    // Drop UI state + show the optimistic pin in a single React commit.
    setMemories((prev) => [...prev, optimisticPin]);
    setMemoryText('');
    setMemoryPlaceLabel('');
    setMemoryPhoto(null);
    setMemoryAudio(null);
    setCreateMemoryOpen(false);
    setMemoryBusy(false);
    // Reset share mode for the next composer session.
    setShareMode('link');
    setSelectedFollowerId('');

    let created: { id: string };
    try {
      created = await api.post<{ id: string }>('/api/memories', {
        textContent: snapshot.text,
        latitude: snapshot.latitude,
        longitude: snapshot.longitude,
        placeLabel: snapshot.placeLabel,
        visibility: snapshot.visibility,
        media: snapshot.media,
      }, token);
    } catch (error) {
      // Rollback: remove the optimistic pin and surface a SPECIFIC error.
      setMemories((prev) => prev.filter((m) => m.id !== optimisticId));
      console.error('[memory] save POST failed:', error);
      const msg = error instanceof Error ? error.message : String(error);
      // Auth0's challenge redirect returns HTML — api.post throws a JSON
      // parse error in that case. Detect and surface as a sign-in prompt.
      if (/Unexpected token|JSON|<!DOCTYPE/i.test(msg)) {
        setPageError('Your sign-in expired. Tap any tab to reload, then sign in again.');
      } else if (/401|403|unauthor/i.test(msg)) {
        setPageError('Sign-in expired. Reload the app to sign in again.');
      } else if (/network|fetch|failed to fetch/i.test(msg)) {
        setPageError('No network connection. Check Wi-Fi or mobile data and try again.');
      } else {
        setPageError(`Could not save: ${msg}`);
      }
      return;
    }

    // Reconcile: server returned the real id. Refresh authoritative list,
    // which will replace the optimistic pin (we filter by id so duplicates
    // can't accumulate even if the server response races). Force-refresh
    // so the bounds cache (added for #6 audit fix) doesn't skip this.
    refreshMemories(true);

    // Branch on share path. Both are fire-and-forget — memory is saved
    // regardless of share success.
    const createdId = created.id;

    // Direct in-app share to a follower: backend creates a MemoryGrant
    // and pushes "shared a memory with you" to the recipient.
    if (sharePath === 'follower' && followerRecipientId) {
      void api
        .post(
          `/api/memories/${createdId}/direct-shares`,
          { recipientUserId: followerRecipientId },
          token,
        )
        .then(() => {
          setPageError('Sent to follower. They\'ll get a notification.');
        })
        .catch((err) => {
          console.error('[memory] direct share failed:', err);
          setPageError(
            err instanceof Error
              ? `Memory saved, but follower send failed: ${err.message}`
              : 'Memory saved, but follower send failed.',
          );
        });
      return;
    }

    // Link share — generate share token, then open the native share sheet
    // OR copy to clipboard. Existing behavior, unchanged.
    void (async () => {
      try {
        const share = await api.post<MemoryShareResponse>(`/api/memories/${createdId}/shares`, undefined, token);
        if (navigator.share) {
          await navigator.share({ title: 'Hidden Brooks memory', text: 'You have a hidden memory waiting for you.', url: share.shareUrl });
        } else if (navigator.clipboard) {
          await navigator.clipboard.writeText(share.shareUrl);
          setPageError('Share link copied');
        }
      } catch {
        // Memory is saved; share is bonus. Stay silent.
      }
    })();
  };

  const handleShareMemory = async (memoryId: string) => {
    if (!token) return;
    setMemoryBusy(true);
    try {
      const share = await api.post<MemoryShareResponse>(`/api/memories/${memoryId}/shares`, undefined, token);
      if (navigator.share) {
        await navigator.share({ title: 'Hidden Brooks memory', text: 'You have a hidden memory waiting for you.', url: share.shareUrl });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(share.shareUrl);
        setPageError('Share link copied');
      }
      refreshMemories(true);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Could not share memory');
    } finally {
      setMemoryBusy(false);
    }
  };

  const runMemoryDeletion = async (path: string, errorMsg: string) => {
    if (!token) return;
    setMemoryBusy(true);
    try {
      await api.delete(path, token);
      setSelectedMemory(null);
      refreshMemories(true);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : errorMsg);
    } finally {
      setMemoryBusy(false);
    }
  };

  const handleDeleteMemory = (memoryId: string) =>
    runMemoryDeletion(`/api/memories/${memoryId}`, 'Could not delete memory');

  const handleRemoveSharedMemory = (memoryId: string) =>
    runMemoryDeletion(`/api/memory-grants/${memoryId}`, 'Could not remove shared memory');

  // Unlock a directly-shared memory by proving the viewer is at the location.
  // Sends current coordinates; the backend reveals (and returns contents) only
  // when within the unlock radius, otherwise tells us how far away we are.
  const handleRevealMemory = async (memory: MemoryMapPin) => {
    if (!token) return;
    if (!userCoordinates || !Array.isArray(userCoordinates)) {
      setPageError('Turn on location to unlock this memory at the spot.');
      return;
    }
    setMemoryBusy(true);
    try {
      const res = await api.post<MemoryRevealResponse>(
        `/api/memories/${memory.id}/reveal`,
        { latitude: userCoordinates[1], longitude: userCoordinates[0] },
        token,
      );
      if (res.revealed && res.memory) {
        const text = res.memory.textContent ?? '';
        setSelectedMemory({
          ...memory,
          revealed: true,
          textPreview: text.length > 200 ? `${text.slice(0, 197)}…` : text,
          hasImage: res.memory.media.some((m) => m.mediaType === 'IMAGE'),
          hasAudio: res.memory.media.some((m) => m.mediaType === 'AUDIO'),
        });
        refreshMemories(true);
      } else {
        setPageError(
          `You are about ${Math.round(res.distanceMeters)}m away. Come within ${Math.round(res.unlockRadiusMeters)}m to unlock it.`,
        );
      }
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Could not unlock memory');
    } finally {
      setMemoryBusy(false);
    }
  };

  useEffect(() => {
    if (!token) {
      return;
    }

    setPinsLoading(true);
    api.get<InfluencerMapResponse>('/api/maps/influencers', token)
      .then((response) => {
        _cachedPins = response.pins;
        _pinsCacheExpiry = Date.now() + PINS_CACHE_TTL;
        setPins(response.pins);
      })
      .catch((error) => setPageError(error instanceof Error ? error.message : 'Failed to load influencer map data'))
      .finally(() => setPinsLoading(false));
  }, [token]);

  // Cache key for the LAST quantized bounds we fetched. Skips the network
  // round-trip when the user's pan stays inside the same grid cell.
  // Reset by callers that need a force-refresh (memory created/deleted/shared).
  const lastFetchedBoundsKeyRef = useRef<string | null>(null);

  const refreshMemories = (force = false) => {
    if (!token || !currentBounds || !activeLayers.memories) {
      return;
    }

    // Snap to the quantization grid so small pans reuse the same cache key.
    // The backend gets a slightly larger bounding box, so client-side
    // filtering (visibleMemories) still trims to the actual viewport.
    const quantized = quantizeBoundsForFetch(currentBounds);
    const key = boundsCacheKey(quantized);
    if (!force && lastFetchedBoundsKeyRef.current === key) {
      return; // same grid cell as last fetch — reuse cached memories state
    }
    lastFetchedBoundsKeyRef.current = key;

    const params = new URLSearchParams({
      north: String(quantized.north),
      south: String(quantized.south),
      east: String(quantized.east),
      west: String(quantized.west),
    });

    setMemoriesLoading(true);
    api.get<MemoryMapResponse>(`/api/memories/map?${params.toString()}`, token)
      .then((response) => {
        _cachedMemories = response.memories;
        _memoriesCacheExpiry = Date.now() + MEMORIES_CACHE_TTL;
        setMemories(response.memories);
      })
      .catch((error) => {
        console.warn('Memory map pins are unavailable', error);
        _cachedMemories = [];
        _memoriesCacheExpiry = Date.now() + MEMORIES_CACHE_TTL;
        setMemories([]);
      })
      .finally(() => setMemoriesLoading(false));
  };

  useEffect(() => {
    refreshMemories();
  }, [token, currentBounds, activeLayers.memories]); // eslint-disable-line react-hooks/exhaustive-deps

  // Deep-link support: `/maps?memory=<id>` from the notification bell or a
  // tapped Android push opens the matching memory card. Two paths:
  //   1. Memory is already in the local `memories` array (in viewport)
  //      → setSelectedMemory immediately with the existing pin shape.
  //   2. Memory is NOT in the local array (shared from a different city,
  //      page-cold-load, etc.) → fetch /api/memories/{id} and project the
  //      MemoryResponse onto a MemoryMapPin so the existing detail card
  //      can render it.
  // A ref sentinel ensures we only auto-select ONCE per id — if the user
  // dismisses the card we don't keep re-opening it on every re-render.
  const autoSelectedMemoryRef = useRef<string | null>(null);
  useEffect(() => {
    const memoryParam = searchParams.get('memory');
    if (!memoryParam) return;
    if (autoSelectedMemoryRef.current === memoryParam) return;

    const localMatch = memories.find((m) => m.id === memoryParam);
    if (localMatch) {
      autoSelectedMemoryRef.current = memoryParam;
      setSelectedMemory(localMatch);
      setSelectedPin(null);
      return;
    }

    // Fall back to fetching the memory by id. Need a token, otherwise the
    // endpoint will 401; we wait for the auth hook to populate it.
    if (!token) return;
    let cancelled = false;
    autoSelectedMemoryRef.current = memoryParam;
    type RemoteMemory = {
      id: string;
      creatorId: string;
      creatorUsername: string | null;
      creatorDisplayName: string | null;
      creatorAvatarUrl: string | null;
      textContent: string;
      latitude: number;
      longitude: number;
      placeLabel: string | null;
      visibility: MemoryVisibility;
      ownedByViewer: boolean;
      revealed?: boolean;
      createdAt: string;
      media?: Array<{ kind: string }>;
    };
    api.get<RemoteMemory>(`/api/memories/${encodeURIComponent(memoryParam)}`, token)
      .then((m) => {
        if (cancelled) return;
        const text = m.textContent ?? '';
        const projected: MemoryMapPin = {
          id: m.id,
          creatorId: m.creatorId,
          creatorUsername: m.creatorUsername,
          creatorDisplayName: m.creatorDisplayName ?? m.creatorUsername ?? 'Someone',
          creatorAvatarUrl: m.creatorAvatarUrl,
          textPreview: text.length > 120 ? text.slice(0, 117) + '…' : text,
          latitude: m.latitude,
          longitude: m.longitude,
          placeLabel: m.placeLabel,
          visibility: m.visibility,
          ownedByViewer: m.ownedByViewer,
          sharedWithViewer: !m.ownedByViewer,
          revealed: m.revealed ?? m.ownedByViewer,
          hasImage: (m.media ?? []).some((x) => x.kind === 'IMAGE'),
          hasAudio: (m.media ?? []).some((x) => x.kind === 'AUDIO'),
          createdAt: m.createdAt,
        };
        setSelectedMemory(projected);
        setSelectedPin(null);
        // Re-center the map on the memory (instant setView, no fly animation).
        mapRef.current?.setView([projected.latitude, projected.longitude], 14, { animate: false });
      })
      .catch((err) => {
        // CRITICAL: do NOT reset autoSelectedMemoryRef here. The effect
        // depends on `memories`, which refreshes on every map pan/zoom.
        // If the fetch fails (404 stale memory, 403 access lost, 500
        // backend hiccup) and we reset the sentinel, the next bounds
        // change re-fires the same failing fetch — and Mapbox's normal
        // viewport churn produces a request per second, saturating the
        // WebView renderer until it freezes. One attempt per id is the
        // contract; failures stay failures until the user navigates
        // explicitly (which gives the URL a new value).
        console.warn('[maps] deep-link memory fetch failed (will not retry):', err);
      });

    return () => {
      cancelled = true;
    };
  }, [searchParams, memories, token]);

  useEffect(() => {
    if (!fallbackCenter || typeof window === 'undefined') {
      setLocationState('fallback');
      return;
    }

    let cancelled = false;
    // Track the LAST coords we pushed to React state. GPS chips emit
    // small jitter even when the phone is stationary; without this we
    // would trigger a full /maps re-render + Mapbox flyTo for every
    // single fix. The 22-second freeze on 2026-05-22 happened after
    // two geolocation calls fired back-to-back at the same instant,
    // and the cascading re-renders / animations are the prime suspect.
    // 5m threshold filters typical GPS noise without missing real motion.
    let lastPushedLng: number | null = null;
    let lastPushedLat: number | null = null;
    const COORDS_DEDUP_METERS = 5;

    const haversineQuick = (lat1: number, lng1: number, lat2: number, lng2: number) => {
      const R = 6_371_000;
      const toRad = (d: number) => (d * Math.PI) / 180;
      const dLat = toRad(lat2 - lat1);
      const dLng = toRad(lng2 - lng1);
      const a = Math.sin(dLat / 2) ** 2
              + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const handleCoords = (lng: number, lat: number) => {
      if (cancelled) return;
      // Dedup: skip the state update if the new fix is essentially the
      // same point as the previous one. setUserCoordinates triggers a
      // full re-render of the /maps subtree + a Mapbox flyTo animation
      // (via the effect with deps [mapReady, userCoordinates]) — both
      // expensive on Android WebView.
      if (lastPushedLng !== null && lastPushedLat !== null) {
        const delta = haversineQuick(lastPushedLat, lastPushedLng, lat, lng);
        if (delta < COORDS_DEDUP_METERS) return;
      }
      lastPushedLng = lng;
      lastPushedLat = lat;
      setUserCoordinates([lng, lat]);
      setLocationState('current');
    };
    const handleFail = () => {
      if (cancelled) return;
      setLocationState('fallback');
    };

    if (isNative()) {
      // navigator.geolocation in the Capacitor WebView is sandboxed and
      // returns null EVEN WHEN the Android-level ACCESS_FINE_LOCATION
      // permission is granted. The @capacitor/geolocation native plugin
      // bridges directly to Android's LocationManager and returns real
      // coordinates as long as the OS permission is granted.
      (async () => {
        try {
          // @ts-ignore - resolved at runtime via npm install
          const mod = await import('@capacitor/geolocation');
          if (cancelled) return;
          const pos = await mod.Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 8000,
          });
          // Defensive null check — the plugin can RESOLVE (not reject)
          // with a position object whose `coords` is undefined when the
          // OS permission race is still in flight (PermissionsBootstrap
          // requests the dialog at roughly the same moment this effect
          // fires; Android can't process two permission requests at once
          // and returns a stale empty result). Reading `.longitude` from
          // undefined was throwing "Cannot read properties of undefined"
          // and dropping the user to fallback coords with a misleading
          // stack trace. Now we just go to fallback silently and let
          // PermissionsBootstrap's dialog finish; the watchPosition
          // started elsewhere will deliver the real coords once they
          // arrive.
          if (!pos?.coords
                || typeof pos.coords.longitude !== 'number'
                || typeof pos.coords.latitude !== 'number') {
            handleFail();
            return;
          }
          handleCoords(pos.coords.longitude, pos.coords.latitude);
        } catch (err) {
          console.error('[MapsExperience] native geolocation failed:', err);
          handleFail();
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    // Web path — standard browser API.
    if (!navigator.geolocation) {
      setLocationState('fallback');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => handleCoords(coords.longitude, coords.latitude),
      handleFail,
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
    return () => {
      cancelled = true;
    };
  }, [fallbackCenter]);

  useEffect(() => {
    if (!mapConfigured || !mapContainerRef.current || mapRef.current || !fallbackCenter) {
      return;
    }

    let cancelled = false;

    const initializeMap = async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet.markercluster'); // augments L with markerClusterGroup
      if (cancelled || !mapContainerRef.current) {
        return;
      }

      const [lng, lat] = fallbackCenter;
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: fallbackZoom ?? 9,
        zoomControl: true,
        attributionControl: true,
        // Animated flyTo loads tiles along the whole path; keep zoom snappy.
        zoomSnap: 0.5,
      });
      mapRef.current = map;

      const tiles = L.tileLayer(rasterTileUrl(themedStyle, mapboxToken), {
        tileSize: 512,
        zoomOffset: -1,
        minZoom: 1,
        maxZoom: 20,
        crossOrigin: true,
        attribution: '© Mapbox © OpenStreetMap',
      }).addTo(map);
      tileLayerRef.current = tiles;
      lastAppliedStyleRef.current = themedStyle;

      // Creator pins live in a marker-cluster group: it auto-clusters below
      // ~zoom 10 and shows individual avatar markers above it — this replaces
      // mapbox's manual cluster source/layers + the syncMarkerVisibility toggle.
      const clusterGroup = L.markerClusterGroup({
        maxClusterRadius: 50,
        disableClusteringAtZoom: 10,
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: false,
        iconCreateFunction: (cluster) => L.divIcon({
          html: `<div style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:9999px;background:#c084fc;color:#fff;font-weight:800;border:2px solid #fff;box-shadow:0 6px 14px rgba(0,0,0,0.24)">${cluster.getChildCount()}</div>`,
          className: '',
          iconSize: [40, 40],
        }),
      }).addTo(map);
      clusterGroupRef.current = clusterGroup;

      // Memory pins: a plain layer group of glyph markers.
      const memoryLayer = L.layerGroup().addTo(map);
      memoryLayerRef.current = memoryLayer;

      const syncBounds = () => {
        const b = map.getBounds();
        if (b) setCurrentBounds(getBoundsState(b));
      };
      map.on('moveend', syncBounds);
      map.whenReady(() => {
        if (cancelled) return;
        // Leaflet measures the container at init; if it wasn't fully laid out
        // yet the map renders blank/half. Re-measure now and next frame (the
        // svh container can settle a tick late).
        map.invalidateSize();
        requestAnimationFrame(() => { if (!cancelled) map.invalidateSize(); });
        setMapReady(true);
        syncBounds();
      });
    };

    initializeMap().catch(() => {
      setPageError('Failed to initialize the map provider');
    });

    return () => {
      cancelled = true;
      markersMapRef.current.forEach((marker) => marker.remove());
      markersMapRef.current.clear();
      markersRef.current = [];
      markerElementsRef.current.clear();
      memoryMarkersMapRef.current.forEach((marker) => marker.remove());
      memoryMarkersMapRef.current.clear();
      memoryMarkersRef.current = [];
      userLocationMarkerRef.current?.remove();
      userLocationMarkerRef.current = null;
      clusterGroupRef.current = null;
      memoryLayerRef.current = null;
      tileLayerRef.current = null;
      setMapReady(false);
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [fallbackCenter, fallbackZoom, mapConfigured, mapboxToken]); // eslint-disable-line react-hooks/exhaustive-deps

  // Theme swap: change the Mapbox style in place instead of destroying
  // and recreating the WebGL context (1-2 s freeze). The 'style.load'
  // listener installed during init re-adds the cluster source/layers
  // since Mapbox wipes custom sources on setStyle. DOM markers (creator
  // pins, memory pins, user location) persist through setStyle and need
  // no re-attach.
  useEffect(() => {
    const tiles = tileLayerRef.current;
    if (!mapRef.current || !mapReady || !tiles) return;
    if (lastAppliedStyleRef.current === themedStyle) return;
    lastAppliedStyleRef.current = themedStyle;
    // Swap raster tiles in place (no WebGL style reload, no context churn).
    tiles.setUrl(rasterTileUrl(themedStyle, mapboxToken));
  }, [themedStyle, mapReady, mapboxToken]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) {
      return;
    }

    const renderPins = async () => {
      const L = (await import('leaflet')).default;
      const cg = clusterGroupRef.current;
      if (!cg) return;

      // Determine which markers need to be added, kept, or removed.
      const currentIds = new Set(viewportMarkerPins.map((pin) => pin.userId));

      // 1. Remove markers for pins that are no longer in the viewport
      markersMapRef.current.forEach((marker, userId) => {
        if (!currentIds.has(userId)) {
          cg.removeLayer(marker);
          markersMapRef.current.delete(userId);
          markerElementsRef.current.delete(userId);
        }
      });

      // 2. Create markers for new pins that entered the viewport
      viewportMarkerPins.forEach((pin) => {
        if (markersMapRef.current.has(pin.userId)) {
          return; // Already has a marker, keep it as is
        }

        const markerElement = document.createElement('button');
        markerElement.type = 'button';
        markerElement.setAttribute('aria-label', `${pin.displayName} influencer pin`);
        markerElement.style.background = 'transparent';
        markerElement.style.border = '0';
        markerElement.style.padding = '0';
        markerElement.style.cursor = 'pointer';

        const outerSize = pin.rank <= 3 ? 48.4 : 44;
        const outerRing = document.createElement('div');
        outerRing.style.width = `${outerSize}px`;
        outerRing.style.height = `${outerSize}px`;
        outerRing.style.borderRadius = '9999px';
        outerRing.style.background = 'var(--brand-primary)';
        outerRing.style.padding = '1.5px';
        outerRing.style.boxShadow = '0 10px 24px rgba(0, 0, 0, 0.24)';
        outerRing.style.transition = 'transform 140ms ease';
        outerRing.style.transform = getMarkerTransform(false);

        const whiteRing = document.createElement('div');
        whiteRing.style.width = '100%';
        whiteRing.style.height = '100%';
        whiteRing.style.borderRadius = '9999px';
        whiteRing.style.background = '#ffffff';
        whiteRing.style.padding = '1.5px';

        const avatar = document.createElement('div');
        avatar.style.width = '100%';
        avatar.style.height = '100%';
        avatar.style.borderRadius = '9999px';
        avatar.style.overflow = 'hidden';
        avatar.style.background = 'var(--bg-hover)';
        avatar.style.display = 'flex';
        avatar.style.alignItems = 'center';
        avatar.style.justifyContent = 'center';
        avatar.style.color = 'var(--text-secondary)';
        avatar.style.fontWeight = '600';
        avatar.style.fontSize = pin.rank <= 3 ? '18px' : '16px';

        if (pin.avatarUrl) {
          const img = document.createElement('img');
          // lazy + async decode keep avatar bitmaps off the critical path and
          // let the WebView skip decoding markers that are scrolled out of the
          // map canvas — a meaningful cut to peak bitmap memory on Android.
          img.loading = 'lazy';
          img.decoding = 'async';
          // The marker renders at ~44px; hint the intrinsic size so the WebView
          // can downscale-on-decode instead of holding a full-resolution bitmap.
          img.width = 48;
          img.height = 48;
          img.src = pin.avatarUrl;
          img.alt = pin.displayName;
          img.style.width = '100%';
          img.style.height = '100%';
          img.style.objectFit = 'cover';
          avatar.appendChild(img);
        } else {
          avatar.textContent = pin.displayName.charAt(0).toUpperCase();
        }

        whiteRing.appendChild(avatar);
        outerRing.appendChild(whiteRing);
        markerElement.appendChild(outerRing);

        markerElement.addEventListener('mouseenter', () => {
          setHoveredMarkerPinId(pin.userId);
        });
        markerElement.addEventListener('mouseleave', () => {
          setHoveredMarkerPinId((current) => (current === pin.userId ? null : current));
        });
        markerElement.addEventListener('click', () => {
          setSelectedPin(pin);
          setSelectedMemory(null);
          map.flyTo([pin.latitude, pin.longitude], Math.max(map.getZoom(), 11));
        });

        const icon = L.divIcon({
          html: markerElement,
          className: '',
          iconSize: [outerSize, outerSize],
          iconAnchor: [outerSize / 2, outerSize / 2],
        });
        const marker = L.marker([pin.latitude, pin.longitude], { icon, keyboard: false });
        cg.addLayer(marker);

        markersMapRef.current.set(pin.userId, marker);
        markerElementsRef.current.set(pin.userId, outerRing);
      });

      // Keep markersRef in sync for the hover-transform effect.
      markersRef.current = Array.from(markersMapRef.current.values());
    };

    renderPins().catch(() => {
      setPageError('Failed to render influencer pins');
    });
  }, [visibleGuidePins, viewportMarkerPins, mapReady]);

  useEffect(() => {
    const activeIds = new Set<string>();
    if (hoveredSlicePinId) {
      activeIds.add(hoveredSlicePinId);
    }
    if (hoveredMarkerPinId) {
      activeIds.add(hoveredMarkerPinId);
    }

    markerElementsRef.current.forEach((outerRing, userId) => {
      outerRing.style.transform = getMarkerTransform(activeIds.has(userId));
    });
  }, [hoveredMarkerPinId, hoveredSlicePinId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) {
      return;
    }

    const renderMemoryPins = async () => {
      const L = (await import('leaflet')).default;
      const layer = memoryLayerRef.current;
      if (!layer) return;

      // Determine which memory markers need to be added, kept, or removed.
      // viewportMemoryPins = viewport-scoped + capped, so off-screen / excess
      // memories never get a DOM marker (prevents the marker-flood LMK crash).
      const currentMemoryIds = new Set(viewportMemoryPins.map((m) => m.id));

      // 1. Remove markers for memories no longer in the (capped) viewport set
      memoryMarkersMapRef.current.forEach((marker, memoryId) => {
        if (!currentMemoryIds.has(memoryId)) {
          layer.removeLayer(marker);
          memoryMarkersMapRef.current.delete(memoryId);
        }
      });

      // 2. Create markers for new memories
      viewportMemoryPins.forEach((memory) => {
        if (memoryMarkersMapRef.current.has(memory.id)) {
          return; // Keep existing marker
        }

        const markerElement = document.createElement('button');
        markerElement.type = 'button';
        const appearance = getMemoryPinAppearance(memory);
        markerElement.setAttribute('aria-label', appearance.ariaLabel);
        markerElement.style.width = '38px';
        markerElement.style.height = '38px';
        markerElement.style.borderRadius = '9999px';
        markerElement.style.border = '2px solid #ffffff';
        markerElement.style.background = appearance.background;
        markerElement.style.color = '#ffffff';
        markerElement.style.fontWeight = '900';
        markerElement.style.boxShadow = '0 12px 24px rgba(0,0,0,0.24)';
        markerElement.style.cursor = 'pointer';
        markerElement.textContent = appearance.glyph;
        markerElement.addEventListener('click', () => {
          setSelectedMemory(memory);
          setSelectedPin(null);
          map.flyTo([memory.latitude, memory.longitude], Math.max(map.getZoom(), 12));
        });

        const icon = L.divIcon({
          html: markerElement,
          className: '',
          iconSize: [38, 38],
          iconAnchor: [19, 19],
        });
        const marker = L.marker([memory.latitude, memory.longitude], { icon, keyboard: false });
        layer.addLayer(marker);

        memoryMarkersMapRef.current.set(memory.id, marker);
      });

      // Synchronize memoryMarkersRef.current array for compatibility with other handlers
      memoryMarkersRef.current = Array.from(memoryMarkersMapRef.current.values());
    };

    renderMemoryPins().catch(() => {
      setPageError('Failed to render memory pins');
    });
  }, [mapReady, viewportMemoryPins]);

  useEffect(() => {
    if (!selectedPin) {
      return;
    }

    const stillVisible = visibleGuidePins.some((pin) => pin.userId === selectedPin.userId);
    if (!stillVisible) {
      setSelectedPin(null);
    }
  }, [visibleGuidePins, selectedPin]);

  useEffect(() => {
    if (!selectedMemory) {
      return;
    }

    const stillVisible = visibleMemories.some((memory) => memory.id === selectedMemory.id);
    if (!stillVisible) {
      setSelectedMemory(null);
    }
  }, [selectedMemory, visibleMemories]);

  useEffect(() => {
    if (!hoveredSlicePinId) {
      return;
    }

    const stillVisible = viewportPins.some((pin) => pin.userId === hoveredSlicePinId);
    if (!stillVisible) {
      setHoveredSlicePinId(null);
    }
  }, [hoveredSlicePinId, viewportPins]);

  useEffect(() => {
    if (!openFilterMenu) {
      return;
    }

    const filterOptionCounts: Record<keyof MapFilterState, number> = {
      countries: countryOptions.length,
      cities: cityOptions.length,
      regions: regionOptions.length,
      verifiedStates: 2,
      priceBuckets: 3,
      dayBuckets: 3,
      placeBuckets: 3,
      followerBuckets: 3,
    };

    if (filterOptionCounts[openFilterMenu] === 0) {
      setOpenFilterMenu(null);
    }
  }, [cityOptions.length, countryOptions.length, openFilterMenu, regionOptions.length]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) {
      return;
    }

    const renderUserMarker = async () => {
      userLocationMarkerRef.current?.remove();
      userLocationMarkerRef.current = null;

      if (!userCoordinates) {
        return;
      }

      const L = (await import('leaflet')).default;
      const markerElement = document.createElement('div');
      markerElement.style.width = '18px';
      markerElement.style.height = '18px';
      markerElement.style.borderRadius = '9999px';
      markerElement.style.background = '#0095f6';
      markerElement.style.border = '3px solid #ffffff';
      markerElement.style.boxShadow = '0 0 0 1px rgba(0,0,0,0.18)';

      const [uLng, uLat] = userCoordinates;
      const icon = L.divIcon({ html: markerElement, className: '', iconSize: [18, 18], iconAnchor: [9, 9] });
      userLocationMarkerRef.current = L.marker([uLat, uLng], { icon, interactive: false, keyboard: false }).addTo(map);
    };

    renderUserMarker().catch(() => {
      setLocationState('unavailable');
    });
  }, [mapReady, userCoordinates]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !userCoordinates) {
      return;
    }

    // Instant setView (no animation): auto-centres on the user once geolocation
    // resolves without animating tiles across the whole camera path.
    const [uLng, uLat] = userCoordinates;
    map.setView([uLat, uLng], Math.max(map.getZoom(), fallbackZoom ?? 9, 10), { animate: false });
  }, [fallbackZoom, mapReady, userCoordinates]);

  if (!mapConfigured) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="mw-panel rounded-xl p-5">
          <h1 className="text-xl font-semibold text-ig-text-primary">Maps page needs runtime configuration</h1>
          <p className="mt-2 text-sm text-ig-text-secondary">
            Set `MAPBOX_PUBLIC_TOKEN`, `MAPBOX_STYLE`, `MAP_DEFAULT_LAT`, `MAP_DEFAULT_LNG`, and `MAP_DEFAULT_ZOOM`
            before loading the map.
          </p>
        </div>
      </div>
    );
  }

  // Root height uses svh (static), NOT dvh: dvh recomputes with the viewport and fed an
  // infinite resize->render loop (heights shrank 602->203px) that drove the GPU runaway.
  return (
    <div className="relative h-[calc(100svh_-_9rem_-_env(safe-area-inset-bottom))] min-h-[420px] w-full overflow-hidden bg-ig-primary md:h-[calc(100svh_-_60px)] md:min-h-0">
      {(tokenLoading || !token) && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-ig-primary">
          <p className="text-ig-text-tertiary">Loading map experience...</p>
        </div>
      )}
      {/* ───────── Top-RIGHT hamburger trigger ─────────
          Opens the right-side drawer holding layer toggles, filters and the
          viewport result list. Placed top-RIGHT because Leaflet renders its
          zoom in/out controls top-LEFT by default — keeping the burger on the
          opposite corner avoids overlapping the zoom buttons.
          The 2 px ink-coloured border (instead of the lighter ig-border)
          gives strong contrast against any map tile background — pale
          parchment streets, dark satellite, green parks, blue water. The
          data-tour attr lets the onboarding tour spotlight this button
          before the drawer opens. */}
      <button
        type="button"
        data-tour="memory-drawer-trigger"
        onClick={() => setDrawerOpen((open) => !open)}
        aria-label="Open guides, filters and layers"
        aria-expanded={drawerOpen}
        className="absolute right-3 top-3 z-30 inline-flex h-touch w-touch items-center justify-center rounded-full border-2 border-ig-text-primary bg-ig-elevated text-ig-text-primary shadow-[0_4px_16px_rgba(15,23,42,0.28)] transition active:scale-95 md:right-4 md:top-4"
      >
        <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
      </button>

      {/* ───────── Bottom-centered "Create a memory" pill + separator ─────
          Always-visible primary creative action, centered. Sits 3 rem (~48 dp)
          above the bottom of the map container, with a thin centered hairline
          1 rem above the bottom-tab nav so there's a clear visual gap +
          divider between the action zone and the nav zone.
          Hidden while: (a) the composer is open, OR (b) a pin/memory popup
          card is showing — in those modes the user is in a focused detail
          view and the create CTA is irrelevant + would compete visually. */}
      {!createMemoryOpen && !selectedPin && !selectedMemory && (
        <>
          <button
            type="button"
            data-tour="memory-create"
            onClick={() => setCreateMemoryOpen(true)}
            className="absolute bottom-12 left-1/2 z-30 inline-flex min-h-touch -translate-x-1/2 items-center gap-2 rounded-full bg-brand-500 px-6 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(15,23,42,0.22)] transition hover:bg-brand-600 active:scale-95"
          >
            <span aria-hidden className="text-base leading-none">+</span>
            <span>Create a memory</span>
          </button>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-4 z-20 mx-auto h-px max-w-[60%] bg-ig-border/70"
          />
        </>
      )}

      {/* ───────── Bottom sheet (mobile) / left panel (desktop) ─────────
          Peek state shows the in-view summary (no longer ambiguous — explicit
          counts for both layer types). Tap drag-handle / count area to expand.
          Expanded reveals filter chips + viewport result list. When memory
          composer is active, the same surface re-purposes for the form. */}
      {/* ───────── Right slide-in drawer ─────────
          Contains layer toggles, filter chips, filter dropdowns, status pills
          and the viewport result list. Opens from the top-right hamburger.
          Replaces the legacy bottom-anchored panel — separating discovery
          (drawer) from primary creation (bottom pill) from the map itself. */}
      {drawerOpen && (
        <div className="absolute inset-0 z-40" style={{ animation: 'mw-drawer-fade-in 220ms ease-out' }}>
          <button
            type="button"
            aria-label="Close drawer"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/75"
          />
          <div
            data-tour="memory-panel"
            className="absolute right-0 top-0 flex h-full w-[min(92vw,420px)] flex-col rounded-l-[28px] border-l-2 border-ig-border bg-ig-primary p-3 shadow-[-18px_0_48px_rgba(15,23,42,0.32)] md:p-4"
            style={{ animation: 'mw-drawer-in 280ms cubic-bezier(0.22, 1, 0.36, 1)' }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="mw-eyebrow text-[11px]">Discovery</p>
                <h2 className="mw-section-title mt-0.5 text-base text-ig-text-primary md:text-xl">
                  {viewportMemories.length === 0 && viewportPins.length === 0
                    ? 'Nothing in view yet'
                    : viewportMemories.length > 0
                      ? `People left ${viewportMemories.length} memor${viewportMemories.length === 1 ? 'y' : 'ies'} here`
                      : `${viewportPins.length} guide${viewportPins.length === 1 ? '' : 's'} around you`}
                </h2>
                <p className="mt-0.5 text-[11px] text-ig-text-tertiary">
                  {viewportPins.length} guides · {viewportMemories.length} memories
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close"
                className="mw-ripple inline-flex h-touch w-touch shrink-0 items-center justify-center rounded-full border border-ig-border bg-ig-elevated text-ig-text-secondary"
              >
                <span aria-hidden className="text-lg leading-none">×</span>
              </button>
            </div>

            <div className="-mr-1 mt-4 flex-1 overflow-y-auto overscroll-contain pr-1">
              <div className="rounded-3xl border-2 border-ig-border bg-ig-primary/80 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="mw-eyebrow text-[11px]">Map layers</p>
                  <span className="text-xs text-ig-text-tertiary">{layerLabel(activeLayers)}</span>
                </div>
                <div data-tour="layer-toggles-container" className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => toggleLayer('memories')}
                    data-tour="layer-toggle-memories"
                    className={`min-h-11 rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
                      activeLayers.memories
                        ? 'border-brand-500/50 bg-brand-500/15 text-brand-500'
                        : 'border-ig-border text-ig-text-secondary hover:text-ig-text-primary'
                    }`}
                  >
                    {activeLayers.memories ? '✓ ' : ''}Memories
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleLayer('guides')}
                    data-tour="layer-toggle-guides"
                    className={`min-h-11 rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
                      activeLayers.guides
                        ? 'border-brand-500/50 bg-brand-500/15 text-brand-500'
                        : 'border-ig-border text-ig-text-secondary hover:text-ig-text-primary'
                    }`}
                  >
                    {activeLayers.guides ? '✓ ' : ''}Guides
                  </button>
                </div>
              </div>

              <div className={`${activeLayers.guides ? 'flex' : 'hidden'} mt-4 flex-wrap gap-2`}>
                <FilterChip
                  label="Country"
                  activeCount={activeFilters.countries.length}
                  active={openFilterMenu === 'countries'}
                  onClick={() => setOpenFilterMenu((current) => (current === 'countries' ? null : 'countries'))}
                />
                <FilterChip
                  label="City"
                  activeCount={activeFilters.cities.length}
                  active={openFilterMenu === 'cities'}
                  onClick={() => setOpenFilterMenu((current) => (current === 'cities' ? null : 'cities'))}
                />
                <FilterChip
                  label="Region"
                  activeCount={activeFilters.regions.length}
                  active={openFilterMenu === 'regions'}
                  onClick={() => setOpenFilterMenu((current) => (current === 'regions' ? null : 'regions'))}
                />
                <FilterChip
                  label="Verified"
                  activeCount={activeFilters.verifiedStates.length}
                  active={openFilterMenu === 'verifiedStates'}
                  onClick={() => setOpenFilterMenu((current) => (current === 'verifiedStates' ? null : 'verifiedStates'))}
                />
                <FilterChip
                  label="Price"
                  activeCount={activeFilters.priceBuckets.length}
                  active={openFilterMenu === 'priceBuckets'}
                  onClick={() => setOpenFilterMenu((current) => (current === 'priceBuckets' ? null : 'priceBuckets'))}
                />
                <FilterChip
                  label="Length"
                  activeCount={activeFilters.dayBuckets.length}
                  active={openFilterMenu === 'dayBuckets'}
                  onClick={() => setOpenFilterMenu((current) => (current === 'dayBuckets' ? null : 'dayBuckets'))}
                />
                <FilterChip
                  label="Places"
                  activeCount={activeFilters.placeBuckets.length}
                  active={openFilterMenu === 'placeBuckets'}
                  onClick={() => setOpenFilterMenu((current) => (current === 'placeBuckets' ? null : 'placeBuckets'))}
                />
                <FilterChip
                  label="Followers"
                  activeCount={activeFilters.followerBuckets.length}
                  active={openFilterMenu === 'followerBuckets'}
                  onClick={() => setOpenFilterMenu((current) => (current === 'followerBuckets' ? null : 'followerBuckets'))}
                />
                <button
                  type="button"
                  onClick={clearAllFilters}
                  disabled={activeFilterCount === 0}
                  className="min-h-11 rounded-full border border-transparent px-4 py-2 text-sm font-medium text-ig-text-tertiary transition hover:text-ig-text-primary disabled:cursor-default disabled:opacity-50 lg:min-h-0 lg:px-3 lg:py-1.5 lg:text-xs"
                >
                  Clear all
                </button>
              </div>

              {activeLayers.guides && openFilterMenu && (
                <div className="mt-3 rounded-3xl border-2 border-ig-border bg-ig-primary/95 p-3 shadow-[0_12px_32px_rgba(15,23,42,0.12)]">
                  {openFilterMenu === 'countries' && (
                    <FilterSection
                      title="Guide country"
                      options={countryOptions}
                      selected={activeFilters.countries}
                      onToggle={(value) => toggleFilterValue('countries', value)}
                    />
                  )}
                  {openFilterMenu === 'cities' && (
                    <FilterSection
                      title="Guide city"
                      options={cityOptions}
                      selected={activeFilters.cities}
                      onToggle={(value) => toggleFilterValue('cities', value)}
                    />
                  )}
                  {openFilterMenu === 'regions' && (
                    <FilterSection
                      title="Creator region"
                      options={regionOptions}
                      selected={activeFilters.regions}
                      onToggle={(value) => toggleFilterValue('regions', value)}
                    />
                  )}
                  {openFilterMenu === 'verifiedStates' && (
                    <FilterSection
                      title="Creator verification"
                      options={['verified', 'unverified']}
                      selected={activeFilters.verifiedStates}
                      onToggle={(value) => toggleFilterValue('verifiedStates', value)}
                      renderLabel={(value) => formatRangeBucket(value, VERIFIED_LABELS)}
                    />
                  )}
                  {openFilterMenu === 'priceBuckets' && (
                    <FilterSection
                      title="Guide price"
                      options={['free', 'budget', 'premium']}
                      selected={activeFilters.priceBuckets}
                      onToggle={(value) => toggleFilterValue('priceBuckets', value)}
                      renderLabel={formatPriceBucket}
                    />
                  )}
                  {openFilterMenu === 'dayBuckets' && (
                    <FilterSection
                      title="Trip length"
                      options={['short', 'medium', 'long']}
                      selected={activeFilters.dayBuckets}
                      onToggle={(value) => toggleFilterValue('dayBuckets', value)}
                      renderLabel={(value) => formatRangeBucket(value, DAY_BUCKET_LABELS)}
                    />
                  )}
                  {openFilterMenu === 'placeBuckets' && (
                    <FilterSection
                      title="Place count"
                      options={['compact', 'balanced', 'full']}
                      selected={activeFilters.placeBuckets}
                      onToggle={(value) => toggleFilterValue('placeBuckets', value)}
                      renderLabel={(value) => formatRangeBucket(value, PLACE_BUCKET_LABELS)}
                    />
                  )}
                  {openFilterMenu === 'followerBuckets' && (
                    <FilterSection
                      title="Follower range"
                      options={['emerging', 'growing', 'established']}
                      selected={activeFilters.followerBuckets}
                      onToggle={(value) => toggleFilterValue('followerBuckets', value)}
                      renderLabel={(value) => formatRangeBucket(value, FOLLOWER_BUCKET_LABELS)}
                    />
                  )}
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-ig-text-tertiary">
                <span className="rounded-pill border border-ig-border px-2 py-1">
                  {locationState === 'current' ? 'Centered on your location' : 'Using configured fallback viewport'}
                </span>
                {searchQuery && (
                  <span className="rounded-pill border border-ig-border px-2 py-1">
                    {hasDirectPinMatches ? `Filtered by "${searchQuery}"` : `No direct pin matches for "${searchQuery}", showing all creators`}
                  </span>
                )}
                {activeFilterCount > 0 && (
                  <span className="rounded-pill border border-ig-border px-2 py-1">
                    {activeFilterCount} active filters
                  </span>
                )}
                {pinsLoading && activeLayers.guides && <span className="rounded-pill border border-ig-border px-2 py-1">Loading guide pins</span>}
                {memoriesLoading && activeLayers.memories && <span className="rounded-pill border border-ig-border px-2 py-1">Loading memories</span>}
                {tokenError && <span className="rounded-pill border border-ig-border px-2 py-1">{tokenError}</span>}
                {!pinsLoading && activeLayers.guides && viewportPins.length === 0 && (
                  <span className="rounded-pill border border-ig-border px-2 py-1">No guides in the current view</span>
                )}
                {!activeLayers.guides && !memoriesLoading && activeLayers.memories && viewportMemories.length === 0 && (
                  <span className="rounded-pill border border-ig-border px-2 py-1">No memories in the current view</span>
                )}
              </div>

              <div className="mt-4">
                {activeLayers.guides ? (
                  // Guides list — left unchanged, rendered exactly as before.
                  <div className="space-y-3">
                    {viewportPins.map((pin) => (
                      <InfluencerViewportSlice
                        key={pin.userId}
                        pin={pin}
                        onHoverStart={setHoveredSlicePinId}
                        onHoverEnd={() => setHoveredSlicePinId(null)}
                      />
                    ))}
                  </div>
                ) : (
                  // Memories list — curated: first 5 visible, "Show all"
                  // expands. First item is highlighted as the closest /
                  // most relevant. Spacing rhythm: extra mt every 4th
                  // item to break the wall-of-cards feel.
                  (() => {
                    const INITIAL_VISIBLE = 5;
                    const total = sortedViewportMemories.length;
                    const showAll = drawerShowAllMemories || total <= INITIAL_VISIBLE;
                    const visible = showAll ? sortedViewportMemories : sortedViewportMemories.slice(0, INITIAL_VISIBLE);
                    const hiddenCount = total - visible.length;
                    return (
                      <>
                        {visible.length > 0 && (
                          <p className="mw-eyebrow mb-2 text-[10px] text-ig-text-tertiary">
                            {visible[0]?.memory.sharedWithViewer ? 'Shared with you · closest' : 'Closest to you'}
                          </p>
                        )}
                        <ul className="list-none p-0">
                          {visible.map((entry, idx) => {
                            const isClosest = idx === 0;
                            // Rhythm: extra top margin every 4th item.
                            const rhythmGap = idx > 0 && idx % 4 === 0 ? 'mt-5' : idx > 0 ? 'mt-3' : '';
                            return (
                              <li key={entry.memory.id} className={rhythmGap}>
                                {isClosest ? (
                                  <div className="relative">
                                    <span className="absolute -top-2 left-3 z-10 rounded-pill border border-brand-500/40 bg-brand-500/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-brand-500">
                                      {entry.memory.sharedWithViewer ? '★ Shared · ' : ''}
                                      {formatDistance(entry.distanceMeters) || 'Closest'}
                                    </span>
                                    <div className="ring-2 ring-brand-500/40 ring-offset-2 ring-offset-ig-primary rounded-[24px]">
                                      <MemoryViewportSlice
                                        memory={entry.memory}
                                        onSelect={(nextMemory) => {
                                          setSelectedMemory(nextMemory);
                                          setSelectedPin(null);
                                        }}
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <MemoryViewportSlice
                                    memory={entry.memory}
                                    onSelect={(nextMemory) => {
                                      setSelectedMemory(nextMemory);
                                      setSelectedPin(null);
                                    }}
                                  />
                                )}
                              </li>
                            );
                          })}
                        </ul>
                        {hiddenCount > 0 && (
                          <button
                            type="button"
                            onClick={() => setDrawerShowAllMemories(true)}
                            className="mt-4 inline-flex w-full min-h-touch items-center justify-center rounded-2xl border-2 border-dashed border-ig-border bg-ig-primary/60 px-4 py-2.5 text-sm font-semibold text-ig-text-secondary transition hover:bg-ig-hover hover:text-ig-text-primary"
                          >
                            Show all nearby memories ({hiddenCount} more)
                          </button>
                        )}
                      </>
                    );
                  })()
                )}
              </div>
            </div>
          </div>
          <style jsx global>{`
            @keyframes mw-drawer-in {
              from { transform: translateX(100%); opacity: 0.6; }
              to   { transform: translateX(0);    opacity: 1;   }
            }
            @keyframes mw-drawer-fade-in {
              from { opacity: 0; }
              to   { opacity: 1; }
            }
          `}</style>
        </div>
      )}

      {/* Pre-mount anchor for the onboarding tour's memory-form spotlight.
          The real composer below mounts via a tour-effect setState which runs
          in useEffect AFTER the first render of the memory-form step — that
          extra commit cycle was the perceived freeze. This invisible stub
          gives the spotlight selector something to anchor to on the FIRST
          commit, so the tooltip and dim overlay appear instantly. The real
          composer takes over on the next commit at the same fullscreen rect
          (no visual jump). */}
      {tourActive && (currentStep as { id?: string } | null)?.id === 'memory-form' && !createMemoryOpen && (
        <div
          data-tour="memory-form"
          aria-hidden
          style={{ position: 'fixed', inset: 0, opacity: 0, pointerEvents: 'none' }}
        />
      )}

      {/* ───────── Full-screen composer modal ─────────
          Pure memory form — no layer toggles, no filters, no result list, no
          other context. Header with close X, body with text/place/visibility/
          media/save, footer link to Creator Academy. Covers everything
          including bottom-tab nav (z-60). */}
      {createMemoryOpen && (
        <div
          data-tour="memory-form"
          className="fixed inset-0 z-[60] flex flex-col bg-ig-primary"
          role="dialog"
          aria-modal="true"
          aria-label="New memory"
        >
          <header
            className="flex items-center gap-3 border-b-2 border-ig-border bg-ig-elevated px-3 py-3"
            style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}
          >
            <button
              type="button"
              onClick={() => setCreateMemoryOpen(false)}
              aria-label="Close composer"
              className="mw-ripple inline-flex h-touch w-touch items-center justify-center rounded-full text-ig-text-secondary"
            >
              <span className="text-lg" aria-hidden>×</span>
            </button>
            <h1 className="flex-1 text-base font-semibold text-ig-text-primary">New memory</h1>
            <span className="text-[11px] text-ig-text-tertiary">{memoryText.length}/500</span>
          </header>

          <div
            className="flex-1 overflow-y-auto px-4 py-5"
            style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
          >
            <textarea
              value={memoryText}
              onChange={(event) => setMemoryText(event.target.value.slice(0, 500))}
              placeholder="Write the memory someone will unlock here..."
              rows={6}
              className="w-full rounded-2xl border-2 border-ig-border bg-ig-elevated px-3 py-3 text-base text-ig-text-primary outline-none transition focus:border-brand-500"
            />
            <p className="mt-2 text-xs text-ig-text-tertiary">
              {Array.isArray(userCoordinates) ? 'Using your current map location' : 'Location required'}
            </p>

            <label className="mt-5 block text-xs font-semibold uppercase tracking-wide text-ig-text-tertiary">
              Place label
            </label>
            <input
              value={memoryPlaceLabel}
              onChange={(event) => setMemoryPlaceLabel(event.target.value)}
              placeholder={"Optional - e.g. \"The corner everyone walks past\""}
              className="mt-1 min-h-touch w-full rounded-2xl border-2 border-ig-border bg-ig-elevated px-3 py-2 text-sm text-ig-text-primary outline-none transition focus:border-brand-500"
            />

            <label className="mt-5 block text-xs font-semibold uppercase tracking-wide text-ig-text-tertiary">
              Who can see this
            </label>
            <select
              value={memoryVisibility}
              onChange={(event) => setMemoryVisibility(event.target.value as MemoryVisibility)}
              className="mt-1 min-h-touch w-full rounded-2xl border-2 border-ig-border bg-ig-elevated px-3 py-2 text-sm text-ig-text-primary outline-none transition focus:border-brand-500"
            >
              <option value="SHARED_LINK">Hidden link</option>
              <option value="FOLLOWERS_PUBLIC">Followers public</option>
              <option value="PRIVATE">Private</option>
            </select>

            <label className="mt-5 block text-xs font-semibold uppercase tracking-wide text-ig-text-tertiary">
              Attach media
            </label>
            <div className="mt-1 grid grid-cols-3 gap-2">
              <label className="mw-ripple flex min-h-touch cursor-pointer items-center justify-center rounded-2xl border-2 border-ig-border bg-ig-elevated px-2 py-2 text-xs font-semibold text-ig-text-secondary transition hover:text-ig-text-primary md:text-sm">
                {memoryPhoto ? '✓ Photo' : 'Photo'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(event) => void handlePhotoSelected(event.target.files?.[0] ?? null)}
                />
              </label>
              <label className="mw-ripple flex min-h-touch cursor-pointer items-center justify-center rounded-2xl border-2 border-ig-border bg-ig-elevated px-2 py-2 text-xs font-semibold text-ig-text-secondary transition hover:text-ig-text-primary md:text-sm">
                {memoryAudio ? '✓ Audio' : 'Audio'}
                <input
                  type="file"
                  accept="audio/mpeg,audio/mp4,audio/webm,audio/ogg,audio/wav"
                  className="hidden"
                  onChange={(event) => void handleAudioSelected(event.target.files?.[0] ?? null)}
                />
              </label>
              <button
                type="button"
                onClick={recording ? stopRecording : startRecording}
                className="mw-ripple flex min-h-touch items-center justify-center rounded-2xl border-2 border-ig-border bg-ig-elevated px-2 py-2 text-xs font-semibold text-ig-text-secondary transition hover:text-ig-text-primary md:text-sm"
              >
                {recording ? 'Stop' : memoryAudio ? 'Re-rec' : 'Record'}
              </button>
            </div>

            {/* Share mode — link (token URL) vs direct share to a follower */}
            <label className="mt-5 block text-xs font-semibold uppercase tracking-wide text-ig-text-tertiary">
              How to share
            </label>
            <div data-tour="share-mode-container" className="mt-1 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShareMode('link')}
                data-tour="share-mode-link"
                className={`min-h-touch rounded-2xl border-2 px-3 py-2 text-xs font-semibold transition ${
                  shareMode === 'link'
                    ? 'border-brand-500 bg-brand-500/10 text-ig-text-primary'
                    : 'border-ig-border bg-ig-elevated text-ig-text-secondary hover:bg-ig-hover'
                }`}
              >
                Share via link
              </button>
              <button
                type="button"
                onClick={() => setShareMode('follower')}
                data-tour="share-mode-follower"
                className={`min-h-touch rounded-2xl border-2 px-3 py-2 text-xs font-semibold transition ${
                  shareMode === 'follower'
                    ? 'border-brand-500 bg-brand-500/10 text-ig-text-primary'
                    : 'border-ig-border bg-ig-elevated text-ig-text-secondary hover:bg-ig-hover'
                }`}
              >
                Share with follower
              </button>
            </div>

            {shareMode === 'follower' && (
              <div className="mt-3">
                {followersLoading ? (
                  <p className="text-xs text-ig-text-tertiary">Loading your followers…</p>
                ) : followers.length === 0 ? (
                  <p className="text-xs text-ig-text-tertiary">
                    No followers yet. Share the app or switch to &quot;Share via link&quot;.
                  </p>
                ) : (
                  <select
                    value={selectedFollowerId}
                    onChange={(e) => setSelectedFollowerId(e.target.value)}
                    className="min-h-touch w-full rounded-2xl border-2 border-ig-border bg-ig-elevated px-3 py-2 text-sm text-ig-text-primary outline-none transition focus:border-brand-500"
                  >
                    <option value="">Pick a follower…</option>
                    {followers.map((f) => (
                      <option key={f.userId} value={f.userId}>
                        {f.displayName}{f.username ? ` (@${f.username})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <button
              type="button"
              disabled={memoryBusy || (shareMode === 'follower' && !selectedFollowerId)}
              onClick={handleCreateMemory}
              className="mw-button-primary mt-6 inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-base font-semibold transition hover:bg-brand-600 disabled:opacity-60"
            >
              {memoryBusy && <Spinner />}
              {memoryBusy
                ? 'Saving...'
                : shareMode === 'follower'
                  ? 'Save and send'
                  : 'Save and share'}
            </button>

            <a
              href="/guides/academy"
              className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-brand-500 hover:underline"
            >
              Tips for memorable memories — Creator Academy →
            </a>
          </div>
        </div>
      )}

      {pageError && (
        <div className="absolute inset-x-4 top-28 z-10 mx-auto max-w-2xl rounded-xl border border-ig-error/40 bg-ig-elevated px-4 py-3 text-sm text-ig-error shadow-lg">
          {pageError}
        </div>
      )}

      {/* z-0 + position + isolate keeps the map its own low stacking context so
          Leaflet stays below the app chrome overlays (z-10…z-60). NOTE: the
          Android WebView did NOT honour this for the sticky navbar on scroll —
          the actual guarantee that Leaflet stays under the header is the
          single-digit z-index cap on .leaflet-* panes/controls in globals.css
          (Leaflet's defaults of 200–1000 were painting over the navbar). */}
      <div ref={mapContainerRef} className="absolute inset-0 z-0 isolate" />

      {selectedPin && <SelectedPinCard pin={selectedPin} onClose={() => setSelectedPin(null)} />}
      {selectedMemory && (
        <SelectedMemoryCard
          memory={selectedMemory}
          token={token ?? ''}
          onClose={() => setSelectedMemory(null)}
          onShare={handleShareMemory}
          onReveal={handleRevealMemory}
          onDelete={handleDeleteMemory}
          onRemove={handleRemoveSharedMemory}
          busy={memoryBusy}
        />
      )}
    </div>
  );
}
