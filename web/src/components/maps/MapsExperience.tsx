'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { GeoJSONSource, LngLatBounds, LngLatLike, Map as MapboxMap, Marker as MapboxMarker } from 'mapbox-gl';
import StarRating from '@/components/reviews/StarRating';
import { api } from '@/lib/api';
import { scoreSearchMatch } from '@/lib/fuzzySearch';
import { useAccessToken } from '@/hooks/useAccessToken';
import type {
  InfluencerMapPin,
  InfluencerMapResponse,
  MediaUploadResponse,
  MemoryMapPin,
  MemoryMapResponse,
  MemoryMediaRequest,
  MemoryShareResponse,
  MemoryVisibility,
} from '@/types';

// Kick off the mapbox-gl download immediately when this module loads in the browser,
// before any useEffect fires. The awaits inside effects then resolve from cache.
if (typeof window !== 'undefined') {
  void import('mapbox-gl');
}

// Module-level pins cache — survives navigation (component unmount/remount).
let _cachedPins: InfluencerMapPin[] | null = null;
let _pinsCacheExpiry = 0;
const PINS_CACHE_TTL = 5 * 60 * 1000;

let _cachedMemories: MemoryMapPin[] | null = null;
let _memoriesCacheExpiry = 0;
const MEMORIES_CACHE_TTL = 60 * 1000;
const LAYER_STORAGE_KEY = 'brooks.maps.layers';

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
  onClose: () => void;
  onShare: (memoryId: string) => void;
  onDelete: (memoryId: string) => void;
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

function getBoundsState(bounds: LngLatBounds): MapBoundsState {
  return {
    north: bounds.getNorth(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    west: bounds.getWest(),
  };
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
      className={`min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition md:min-h-0 md:px-3 md:py-1.5 md:text-xs ${
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
              className={`min-h-11 rounded-full border px-4 py-2 text-sm transition md:min-h-0 md:px-3 md:py-1.5 md:text-xs ${
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
      className="flex items-center gap-3 rounded-full border border-ig-border bg-ig-primary/90 px-3 py-2 shadow-[0_8px_21px_rgba(15,23,42,0.08)] backdrop-blur transition-transform duration-150 hover:-translate-y-0.5"
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
      className="flex w-full items-center gap-3 rounded-[24px] border border-ig-border bg-ig-primary/90 px-3 py-2 text-left shadow-[0_8px_21px_rgba(15,23,42,0.08)] backdrop-blur transition-transform duration-150 hover:-translate-y-0.5"
    >
      <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-black text-white shadow-[0_0_0_2px_rgba(255,255,255,0.9)]">
        M
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-ig-text-primary">{memory.textPreview}</p>
        <p className="mt-1 truncate text-[11px] leading-4 text-ig-text-tertiary">
          {memory.placeLabel || `By ${memory.creatorDisplayName}`} · {visibilityLabel}
          {memory.hasAudio ? ' · Audio' : ''}
          {memory.hasImage ? ' · Photo' : ''}
        </p>
      </div>
    </button>
  );
}

function SelectedMemoryCard({ memory, onClose, onShare, onDelete, busy }: SelectedMemoryCardProps) {
  return (
    <div className="absolute inset-x-3 bottom-4 z-10 mx-auto max-w-md rounded-2xl border border-ig-border bg-ig-elevated/95 p-4 shadow-2xl backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-brand-500">Memory pin</p>
          <h2 className="mt-1 text-base font-semibold text-ig-text-primary">{memory.textPreview}</h2>
          <p className="mt-2 text-sm text-ig-text-secondary">
            {memory.placeLabel || 'Hidden at this location'} · by {memory.creatorDisplayName}
          </p>
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
            className="min-h-11 rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
          >
            Share
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onDelete(memory.id)}
            className="min-h-11 rounded-md border border-ig-border px-4 py-2 text-sm font-semibold text-ig-text-secondary transition-colors hover:bg-ig-hover hover:text-ig-text-primary disabled:opacity-60"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function SelectedPinCard({ pin, onClose }: SelectedPinCardProps) {
  return (
    <div className="absolute inset-x-3 bottom-4 z-10 mx-auto max-w-md rounded-2xl border border-ig-border bg-ig-elevated/95 p-4 shadow-2xl backdrop-blur">
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
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markersRef = useRef<MapboxMarker[]>([]);
  const markerElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const memoryMarkersRef = useRef<MapboxMarker[]>([]);
  const userLocationMarkerRef = useRef<MapboxMarker | null>(null);

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
  const [userCoordinates, setUserCoordinates] = useState<LngLatLike | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [currentBounds, setCurrentBounds] = useState<MapBoundsState | null>(null);
  const [hoveredSlicePinId, setHoveredSlicePinId] = useState<string | null>(null);
  const [hoveredMarkerPinId, setHoveredMarkerPinId] = useState<string | null>(null);
  const [openFilterMenu, setOpenFilterMenu] = useState<FilterMenuKey>(null);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [activeLayers, setActiveLayers] = useState<MapLayerState>(DEFAULT_LAYERS);
  const [createMemoryOpen, setCreateMemoryOpen] = useState(false);
  const [memoryText, setMemoryText] = useState('');
  const [memoryPlaceLabel, setMemoryPlaceLabel] = useState('');
  const [memoryVisibility, setMemoryVisibility] = useState<MemoryVisibility>('SHARED_LINK');
  const [memoryPhoto, setMemoryPhoto] = useState<MemoryMediaRequest | null>(null);
  const [memoryAudio, setMemoryAudio] = useState<MemoryMediaRequest | null>(null);
  const [memoryBusy, setMemoryBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);

  const mapConfigured = Boolean(
    mapboxToken &&
    mapStyle &&
    fallbackLatitude !== null &&
    fallbackLongitude !== null &&
    fallbackZoom !== null,
  );

  const fallbackCenter = useMemo<LngLatLike | null>(() => {
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

  const viewportMemories = useMemo(() => {
    return visibleMemories.filter((memory) => isMemoryWithinBounds(memory, currentBounds));
  }, [currentBounds, visibleMemories]);

  useEffect(() => {
    if (!tokenLoading && !token) {
      router.push('/api/auth/login');
    }
  }, [router, token, tokenLoading]);

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
    if (!token || !userCoordinates || !Array.isArray(userCoordinates)) {
      setPageError('Your current location is required to create a memory');
      return;
    }
    const trimmedText = memoryText.trim();
    if (!trimmedText) {
      setPageError('Memory text is required');
      return;
    }

    setMemoryBusy(true);
    try {
      const media = [memoryPhoto, memoryAudio].filter((item): item is MemoryMediaRequest => Boolean(item));
      const created = await api.post<{ id: string }>('/api/memories', {
        textContent: trimmedText,
        latitude: userCoordinates[1],
        longitude: userCoordinates[0],
        placeLabel: memoryPlaceLabel.trim() || undefined,
        visibility: memoryVisibility,
        media,
      }, token);
      setMemoryText('');
      setMemoryPlaceLabel('');
      setMemoryPhoto(null);
      setMemoryAudio(null);
      setCreateMemoryOpen(false);
      await api.post<MemoryShareResponse>(`/api/memories/${created.id}/shares`, undefined, token).then(async (share) => {
        if (navigator.share) {
          await navigator.share({ title: 'Hidden Brooks memory', text: 'You have a hidden memory waiting for you.', url: share.shareUrl });
        } else if (navigator.clipboard) {
          await navigator.clipboard.writeText(share.shareUrl);
          setPageError('Share link copied');
        }
      });
      refreshMemories();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Could not create memory');
    } finally {
      setMemoryBusy(false);
    }
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
      refreshMemories();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Could not share memory');
    } finally {
      setMemoryBusy(false);
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    if (!token) return;
    setMemoryBusy(true);
    try {
      await api.delete(`/api/memories/${memoryId}`, token);
      setSelectedMemory(null);
      refreshMemories();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Could not delete memory');
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

  const refreshMemories = () => {
    if (!token) {
      return;
    }

    setMemoriesLoading(true);
    api.get<MemoryMapResponse>('/api/memories/map', token)
      .then((response) => {
        _cachedMemories = response.memories;
        _memoriesCacheExpiry = Date.now() + MEMORIES_CACHE_TTL;
        setMemories(response.memories);
      })
      .catch((error) => setPageError(error instanceof Error ? error.message : 'Failed to load memories'))
      .finally(() => setMemoriesLoading(false));
  };

  useEffect(() => {
    refreshMemories();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!fallbackCenter || typeof window === 'undefined' || !navigator.geolocation) {
      setLocationState('fallback');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setUserCoordinates([coords.longitude, coords.latitude]);
        setLocationState('current');
      },
      () => setLocationState('fallback'),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  }, [fallbackCenter]);

  useEffect(() => {
    if (!mapConfigured || !mapContainerRef.current || mapRef.current || !fallbackCenter) {
      return;
    }

    let cancelled = false;

    const initializeMap = async () => {
      const mapboxglModule = await import('mapbox-gl');
      const mapboxgl = mapboxglModule.default;

      if (cancelled || !mapContainerRef.current) {
        return;
      }

      mapboxgl.accessToken = mapboxToken;

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: mapStyle,
        center: fallbackCenter,
        zoom: fallbackZoom ?? undefined,
      });

      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
      mapRef.current = map;

      map.on('load', () => {
        setMapReady(true);

        // Cluster source + layers for zoomed-out view
        map.addSource('creator-clusters', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
          cluster: true,
          clusterMaxZoom: 9,
          clusterRadius: 50,
        });

        map.addLayer({
          id: 'cluster-circles',
          type: 'circle',
          source: 'creator-clusters',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': '#c084fc',
            'circle-radius': ['step', ['get', 'point_count'], 20, 10, 28, 50, 36],
            'circle-opacity': 0.92,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
        });

        map.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'creator-clusters',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 13,
          },
          paint: { 'text-color': '#ffffff' },
        });

        map.on('click', 'cluster-circles', (e) => {
          const features = map.queryRenderedFeatures(e.point, { layers: ['cluster-circles'] });
          const feature = features[0];
          if (!feature?.geometry || feature.geometry.type !== 'Point') return;
          const point = feature.geometry as GeoJSON.Point;
          const clusterId = feature.properties?.cluster_id as number | undefined;
          if (clusterId == null) return;
          const src = map.getSource('creator-clusters') as GeoJSONSource;
          src.getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err || zoom == null) return;
            map.flyTo({
              center: point.coordinates as [number, number],
              zoom: zoom + 0.5,
              essential: true,
            });
          });
        });

        map.on('mouseenter', 'cluster-circles', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'cluster-circles', () => { map.getCanvas().style.cursor = ''; });

        const syncMarkerVisibility = () => {
          const showHtml = map.getZoom() >= 10;
          markersRef.current.forEach((m) => { m.getElement().style.display = showHtml ? '' : 'none'; });
          if (map.getLayer('cluster-circles')) {
            map.setLayoutProperty('cluster-circles', 'visibility', showHtml ? 'none' : 'visible');
            map.setLayoutProperty('cluster-count', 'visibility', showHtml ? 'none' : 'visible');
          }
        };
        map.on('zoom', syncMarkerVisibility);
        syncMarkerVisibility();
      });

      map.on('moveend', () => {
        const nextBounds = map.getBounds();
        if (nextBounds) {
          setCurrentBounds(getBoundsState(nextBounds));
        }
      });
    };

    initializeMap().catch(() => {
      setPageError('Failed to initialize the map provider');
    });

    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      markerElementsRef.current.clear();
      memoryMarkersRef.current.forEach((marker) => marker.remove());
      memoryMarkersRef.current = [];
      userLocationMarkerRef.current?.remove();
      userLocationMarkerRef.current = null;
      setMapReady(false);
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [fallbackCenter, fallbackZoom, mapConfigured, mapStyle, mapboxToken]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !userCoordinates) return;
    map.flyTo({ center: userCoordinates, zoom: Math.max(fallbackZoom ?? 9, 10), essential: true });
  }, [mapReady, userCoordinates, fallbackZoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) {
      return;
    }

    const renderPins = async () => {
      const mapboxglModule = await import('mapbox-gl');
      const mapboxgl = mapboxglModule.default;

      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      markerElementsRef.current.clear();

      // Update cluster GeoJSON source when pins change
      const clusterSource = map.getSource('creator-clusters') as GeoJSONSource | undefined;
      if (clusterSource) {
        clusterSource.setData({
          type: 'FeatureCollection',
          features: visibleGuidePins.map((pin) => ({
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: [pin.longitude, pin.latitude] },
            properties: { userId: pin.userId },
          })),
        });
      }

      visibleGuidePins.forEach((pin) => {
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
          map.flyTo({
            center: [pin.longitude, pin.latitude],
            zoom: Math.max(map.getZoom(), 11),
            essential: true,
          });
        });

        const marker = new mapboxgl.Marker({ element: markerElement, anchor: 'center' })
          .setLngLat([pin.longitude, pin.latitude])
          .addTo(map);

        markersRef.current.push(marker);
        markerElementsRef.current.set(pin.userId, outerRing);
      });

      // Apply current zoom visibility to newly created markers
      const showHtml = map.getZoom() >= 10;
      markersRef.current.forEach((m) => { m.getElement().style.display = showHtml ? '' : 'none'; });
    };

    renderPins().catch(() => {
      setPageError('Failed to render influencer pins');
    });
  }, [visibleGuidePins, mapReady]);

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
      const mapboxglModule = await import('mapbox-gl');
      const mapboxgl = mapboxglModule.default;

      memoryMarkersRef.current.forEach((marker) => marker.remove());
      memoryMarkersRef.current = [];

      visibleMemories.forEach((memory) => {
        const markerElement = document.createElement('button');
        markerElement.type = 'button';
        markerElement.setAttribute('aria-label', 'Memory pin');
        markerElement.style.width = '38px';
        markerElement.style.height = '38px';
        markerElement.style.borderRadius = '9999px';
        markerElement.style.border = '2px solid #ffffff';
        markerElement.style.background = memory.ownedByViewer ? '#ef2f6d' : '#12c7c9';
        markerElement.style.color = '#ffffff';
        markerElement.style.fontWeight = '900';
        markerElement.style.boxShadow = '0 12px 24px rgba(0,0,0,0.24)';
        markerElement.style.cursor = 'pointer';
        markerElement.style.transition = 'transform 140ms ease';
        markerElement.textContent = 'M';
        markerElement.addEventListener('mouseenter', () => {
          markerElement.style.transform = 'translateY(-4px) scale(1.05)';
        });
        markerElement.addEventListener('mouseleave', () => {
          markerElement.style.transform = 'translateY(0) scale(1)';
        });
        markerElement.addEventListener('click', () => {
          setSelectedMemory(memory);
          setSelectedPin(null);
          map.flyTo({
            center: [memory.longitude, memory.latitude],
            zoom: Math.max(map.getZoom(), 12),
            essential: true,
          });
        });

        const marker = new mapboxgl.Marker({ element: markerElement, anchor: 'center' })
          .setLngLat([memory.longitude, memory.latitude])
          .addTo(map);
        memoryMarkersRef.current.push(marker);
      });
    };

    renderMemoryPins().catch(() => {
      setPageError('Failed to render memory pins');
    });
  }, [mapReady, visibleMemories]);

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

      const mapboxglModule = await import('mapbox-gl');
      const mapboxgl = mapboxglModule.default;
      const markerElement = document.createElement('div');
      markerElement.style.width = '18px';
      markerElement.style.height = '18px';
      markerElement.style.borderRadius = '9999px';
      markerElement.style.background = '#0095f6';
      markerElement.style.border = '3px solid #ffffff';
      markerElement.style.boxShadow = '0 0 0 1px rgba(0,0,0,0.18)';

      userLocationMarkerRef.current = new mapboxgl.Marker({ element: markerElement })
        .setLngLat(userCoordinates)
        .addTo(map);
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

    map.flyTo({
      center: userCoordinates,
      zoom: Math.max(map.getZoom(), fallbackZoom ?? 9, 10),
      essential: true,
    });
  }, [fallbackZoom, userCoordinates]);

  if (!mapConfigured) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-xl border border-ig-border bg-ig-elevated p-5">
          <h1 className="text-xl font-semibold text-ig-text-primary">Maps page needs runtime configuration</h1>
          <p className="mt-2 text-sm text-ig-text-secondary">
            Set `MAPBOX_PUBLIC_TOKEN`, `MAPBOX_STYLE`, `MAP_DEFAULT_LAT`, `MAP_DEFAULT_LNG`, and `MAP_DEFAULT_ZOOM`
            before loading the map.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-120px)] w-full overflow-hidden bg-ig-primary md:h-[calc(100vh-60px)]">
      {(tokenLoading || !token) && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-ig-primary">
          <p className="text-ig-text-tertiary">Loading map experience...</p>
        </div>
      )}
      <div className="absolute inset-x-3 bottom-4 z-10 max-h-[62vh] rounded-[28px] border border-ig-border bg-ig-elevated/95 p-4 shadow-xl backdrop-blur md:inset-x-auto md:bottom-auto md:left-4 md:top-4 md:w-[min(380px,calc(100vw-2rem))] md:max-h-[calc(100vh-92px)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-brand-500">Brooks Maps</p>
            <h1 className="mt-1 text-xl font-semibold text-ig-text-primary md:text-2xl">{activeLayers.guides ? 'Guides in view' : 'Memories in view'}</h1>
          </div>
          <button
            type="button"
            onClick={() => setMobilePanelOpen((open) => !open)}
            className="min-h-11 rounded-full bg-brand-500/15 px-4 py-2 text-sm font-semibold text-brand-500 md:pointer-events-none md:min-h-0 md:px-3 md:py-1 md:text-xs"
          >
            {activeLayers.guides ? viewportPins.length : viewportMemories.length} visible
          </button>
        </div>
        <div className={`${mobilePanelOpen ? 'block' : 'hidden'} md:block`}>
        <div className="mt-4 rounded-3xl border border-ig-border bg-ig-primary/80 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ig-text-tertiary">Map layers</p>
            <span className="text-xs text-ig-text-tertiary">{layerLabel(activeLayers)}</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => toggleLayer('memories')}
              className={`min-h-11 rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
                activeLayers.memories
                  ? 'border-brand-500/30 bg-brand-500/10 text-brand-600'
                  : 'border-ig-border text-ig-text-secondary hover:text-ig-text-primary'
              }`}
            >
              {activeLayers.memories ? '✓ ' : ''}Memories
            </button>
            <button
              type="button"
              onClick={() => toggleLayer('guides')}
              className={`min-h-11 rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
                activeLayers.guides
                  ? 'border-brand-500/30 bg-brand-500/10 text-brand-600'
                  : 'border-ig-border text-ig-text-secondary hover:text-ig-text-primary'
              }`}
            >
              {activeLayers.guides ? '✓ ' : ''}Guides
            </button>
          </div>
          <button
            type="button"
            onClick={() => setCreateMemoryOpen((open) => !open)}
            className="mt-3 min-h-11 w-full rounded-2xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            {createMemoryOpen ? 'Close memory creator' : 'Create hidden memory'}
          </button>
        </div>
        {createMemoryOpen && (
          <div className="mt-3 rounded-3xl border border-ig-border bg-ig-primary/95 p-3 shadow-[0_12px_32px_rgba(15,23,42,0.12)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ig-text-tertiary">New memory</p>
            <textarea
              value={memoryText}
              onChange={(event) => setMemoryText(event.target.value.slice(0, 500))}
              placeholder="Write the memory someone will unlock here..."
              className="mt-3 min-h-24 w-full rounded-2xl border border-ig-border bg-ig-elevated px-3 py-2 text-sm text-ig-text-primary outline-none transition focus:border-brand-500"
            />
            <div className="mt-2 flex items-center justify-between text-xs text-ig-text-tertiary">
              <span>{Array.isArray(userCoordinates) ? 'Using your current map location' : 'Location required'}</span>
              <span>{memoryText.length}/500</span>
            </div>
            <input
              value={memoryPlaceLabel}
              onChange={(event) => setMemoryPlaceLabel(event.target.value)}
              placeholder="Place label, optional"
              className="mt-3 min-h-11 w-full rounded-2xl border border-ig-border bg-ig-elevated px-3 py-2 text-sm text-ig-text-primary outline-none transition focus:border-brand-500"
            />
            <select
              value={memoryVisibility}
              onChange={(event) => setMemoryVisibility(event.target.value as MemoryVisibility)}
              className="mt-3 min-h-11 w-full rounded-2xl border border-ig-border bg-ig-elevated px-3 py-2 text-sm text-ig-text-primary outline-none transition focus:border-brand-500"
            >
              <option value="SHARED_LINK">Hidden link</option>
              <option value="FOLLOWERS_PUBLIC">Followers public</option>
              <option value="PRIVATE">Private</option>
            </select>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="flex min-h-11 cursor-pointer items-center justify-center rounded-2xl border border-ig-border px-3 py-2 text-sm font-semibold text-ig-text-secondary transition hover:text-ig-text-primary">
                {memoryPhoto ? 'Photo added' : 'Add photo'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(event) => void handlePhotoSelected(event.target.files?.[0] ?? null)}
                />
              </label>
              <label className="flex min-h-11 cursor-pointer items-center justify-center rounded-2xl border border-ig-border px-3 py-2 text-sm font-semibold text-ig-text-secondary transition hover:text-ig-text-primary">
                {memoryAudio ? 'Audio added' : 'Upload audio'}
                <input
                  type="file"
                  accept="audio/mpeg,audio/mp4,audio/webm,audio/ogg,audio/wav"
                  className="hidden"
                  onChange={(event) => void handleAudioSelected(event.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              className="mt-2 min-h-11 w-full rounded-2xl border border-ig-border px-3 py-2 text-sm font-semibold text-ig-text-secondary transition hover:text-ig-text-primary"
            >
              {recording ? 'Stop recording' : memoryAudio ? 'Record again' : 'Record audio'}
            </button>
            <button
              type="button"
              disabled={memoryBusy}
              onClick={handleCreateMemory}
              className="mt-3 min-h-11 w-full rounded-2xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
            >
              {memoryBusy ? 'Saving...' : 'Save and share'}
            </button>
          </div>
        )}
        <div className={`${activeLayers.guides ? 'flex' : 'hidden'} mt-4 max-h-28 flex-wrap gap-2 overflow-y-auto md:max-h-none`}>
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
            className="min-h-11 rounded-full border border-transparent px-4 py-2 text-sm font-medium text-ig-text-tertiary transition hover:text-ig-text-primary disabled:cursor-default disabled:opacity-50 md:min-h-0 md:px-3 md:py-1.5 md:text-xs"
          >
            Clear all
          </button>
        </div>
        {activeLayers.guides && openFilterMenu && (
          <div className="mt-3 rounded-3xl border border-ig-border bg-ig-primary/95 p-3 shadow-[0_12px_32px_rgba(15,23,42,0.12)]">
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
        <p className="mt-2 hidden text-sm text-ig-text-secondary md:block">
          The panel tracks the current map viewport. When both layers are on, guide slices stay here first; uncheck Guides to browse memory slices.
        </p>
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
        <div className="mt-4 max-h-[26vh] space-y-3 overflow-y-auto pr-1 md:max-h-[55vh]">
          {activeLayers.guides
            ? viewportPins.map((pin) => (
                <InfluencerViewportSlice
                  key={pin.userId}
                  pin={pin}
                  onHoverStart={setHoveredSlicePinId}
                  onHoverEnd={() => setHoveredSlicePinId(null)}
                />
              ))
            : viewportMemories.map((memory) => (
                <MemoryViewportSlice
                  key={memory.id}
                  memory={memory}
                  onSelect={(nextMemory) => {
                    setSelectedMemory(nextMemory);
                    setSelectedPin(null);
                  }}
                />
              ))}
        </div>
        </div>
      </div>

      {pageError && (
        <div className="absolute inset-x-4 top-28 z-10 mx-auto max-w-2xl rounded-xl border border-ig-error/40 bg-ig-elevated/95 px-4 py-3 text-sm text-ig-error shadow-lg backdrop-blur">
          {pageError}
        </div>
      )}

      <div ref={mapContainerRef} className="h-full w-full" />

      {selectedPin && <SelectedPinCard pin={selectedPin} onClose={() => setSelectedPin(null)} />}
      {selectedMemory && (
        <SelectedMemoryCard
          memory={selectedMemory}
          onClose={() => setSelectedMemory(null)}
          onShare={handleShareMemory}
          onDelete={handleDeleteMemory}
          busy={memoryBusy}
        />
      )}
    </div>
  );
}
