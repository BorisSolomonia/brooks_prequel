'use client';

import { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import type { Map as LeafletMap, Marker as LeafletMarker, TileLayer as LeafletTileLayer, LeafletMouseEvent } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ImageUploadField } from '@/components/media/ImageUploadField';
import { rasterTileUrl, useMapboxStyle } from '@/lib/mapboxStyle';
import { reverseGeocode, searchCities, type GeoPlace } from '@/lib/geocode';
import { getCurrentCoords } from '@/lib/geolocation';
import { streamPost } from '@/lib/api';
import type { AiKeyResponse, GuideCreateRequest, GuideUpdateRequest } from '@/types';

const GENERIC_ADJECTIVES = /\b(beautiful|nice|amazing|great|wonderful|awesome|fantastic|incredible|gorgeous|lovely|perfect|excellent)\b/gi;

interface Props {
  data: GuideCreateRequest | GuideUpdateRequest;
  onChange: (data: GuideCreateRequest | GuideUpdateRequest) => void;
  // Merge a partial change into the LATEST state (functional update). Preferred
  // over onChange for any field write — it's immune to stale snapshots, which is
  // what fixes fields vanishing after an async image upload or location prefill.
  onPatch: (patch: Partial<GuideUpdateRequest>) => void;
  tagInput: string;
  onTagInputChange: (value: string) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
  token: string;
  // Used by the "Add a hook" AI description generator to pick a provider. Empty → button disabled.
  aiKeys?: AiKeyResponse[];
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_PUBLIC_TOKEN ?? '';

const roundCoord = (n: number) => Math.round(n * 1e6) / 1e6;

// City typeahead backed by Mapbox forward geocoding. Typing keeps primaryCity in
// sync (onType); picking a suggestion fills city + region + country + coords
// (onSelect), which also moves the destination pin via the shared lat/lng state.
function CityAutocomplete({ value, onType, onSelect }: {
  value: string;
  onType: (text: string) => void;
  onSelect: (place: GeoPlace) => void;
}) {
  const [suggestions, setSuggestions] = useState<GeoPlace[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<number | null>(null);

  const handleInput = (text: string) => {
    onType(text);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (text.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      const results = await searchCities(text);
      setSuggestions(results);
      setOpen(results.length > 0);
    }, 300);
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        autoComplete="off"
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => { if (suggestions.length) setOpen(true); }}
        // Delay close so a suggestion's onMouseDown registers before blur.
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        placeholder="Start typing a city…"
        className="min-h-11 w-full rounded-md border border-ig-border bg-ig-secondary px-3 py-2 text-base text-ig-text-primary placeholder:text-ig-text-tertiary focus:border-ig-blue focus:outline-none"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-ig-border bg-ig-elevated shadow-lg">
          {suggestions.map((s) => (
            <li key={`${s.placeName}-${s.latitude}-${s.longitude}`}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onSelect(s); setOpen(false); }}
                className="block w-full px-3 py-2 text-left text-sm text-ig-text-primary transition-colors hover:bg-ig-hover"
              >
                {s.placeName}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Interactive destination pin-picker. Uses Leaflet + Mapbox RASTER tiles (no
// WebGL): mapbox-gl's tile GL textures are never freed by the Android System
// WebView's GPU layer on pan, ratcheting memory to ~4 GB → LMK kill. Raster
// <img> tiles have no GL textures to leak. See POSTMORTEM_MAPS_GPU_OOM.md.
//
// Adds a one-tap "Use my location" button (geolocate → center + pin) and reverse
// geocodes any pin position to prefill city/region/country via onResolvePlace.
function DestinationMap({ lat, lng, onChange, onResolvePlace }: {
  lat: number | null | undefined;
  lng: number | null | undefined;
  onChange: (lat: number, lng: number) => void;
  onResolvePlace: (place: GeoPlace) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const tileLayerRef = useRef<LeafletTileLayer | null>(null);
  const mapboxStyle = useMapboxStyle();

  // Keep the latest callbacks in refs so the init effect (deps []) never calls a
  // stale onChange/onResolvePlace.
  const onChangeRef = useRef(onChange);
  const onResolveRef = useRef(onResolvePlace);
  useEffect(() => { onChangeRef.current = onChange; onResolveRef.current = onResolvePlace; });

  // Commit a coordinate: update form state, move the pin (+ optionally recenter),
  // then reverse-geocode to prefill the place fields.
  const applyCoords = useCallback((la: number, lo: number, recenter: boolean) => {
    onChangeRef.current(roundCoord(la), roundCoord(lo));
    const map = mapRef.current;
    const marker = markerRef.current;
    if (marker) marker.setLatLng([la, lo]);
    if (map && recenter) map.setView([la, lo], Math.max(map.getZoom(), 10), { animate: false });
    void reverseGeocode(la, lo).then((place) => { if (place) onResolveRef.current(place); });
  }, []);

  // Live theme switch: swap the raster tile URL rather than rebuilding the map.
  useEffect(() => {
    tileLayerRef.current?.setUrl(rasterTileUrl(mapboxStyle, MAPBOX_TOKEN));
  }, [mapboxStyle]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !MAPBOX_TOKEN) return;
    let cancelled = false;

    const init = async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !containerRef.current) return;

      // Leaflet uses [lat, lng]. Default to a world view when unset.
      const center: [number, number] = lat != null && lng != null ? [lat, lng] : [20, 0];
      const map = L.map(containerRef.current, {
        center,
        zoom: lat != null ? 8 : 1,
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

      // divIcon (a styled <div>) avoids Leaflet's default image-marker assets,
      // which break under the Next bundler.
      const icon = L.divIcon({
        html: '<div style="width:22px;height:22px;border-radius:9999px;background:#3b82f6;border:3px solid #fff;box-shadow:0 4px 10px rgba(0,0,0,0.35)"></div>',
        className: '',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      const marker = L.marker(center, { draggable: true, icon }).addTo(map);
      markerRef.current = marker;

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        applyCoords(pos.lat, pos.lng, false);
      });
      map.on('click', (e: LeafletMouseEvent) => {
        applyCoords(e.latlng.lat, e.latlng.lng, false);
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
  }, [applyCoords]); // eslint-disable-line react-hooks/exhaustive-deps

  // Recenter the pin when coords are set from OUTSIDE (e.g. city autocomplete).
  // Epsilon guard prevents a feedback loop with applyCoords' own onChange.
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker || lat == null || lng == null) return;
    const cur = marker.getLatLng();
    if (Math.abs(cur.lat - lat) < 1e-6 && Math.abs(cur.lng - lng) < 1e-6) return;
    marker.setLatLng([lat, lng]);
    map.setView([lat, lng], Math.max(map.getZoom(), 10), { animate: false });
  }, [lat, lng]);

  if (!MAPBOX_TOKEN) return null;
  // "Use my current location" lives at the form level (between Description and
  // Region); when it sets lat/lng, the recenter effect above moves this pin.
  return <div ref={containerRef} className="h-64 w-full overflow-hidden rounded-lg border border-ig-border md:h-44" />;
}

// "Add a hook" — AI description generator. Stateless (POST /api/ai/guide-hook), so it works during
// guide creation before the guide is saved. Streams a draft from the title; the user can edit the
// draft and Resend (with an optional instruction) to refine, Regenerate from scratch, or Apply it
// to the Description field. Disabled with a hint when no AI key is configured or the title is empty.
function HookGenerator({ title, currentDescription, city, region, token, provider, onApply }: {
  title: string;
  currentDescription: string;
  city: string;
  region: string;
  token: string;
  provider: string | null;
  onApply: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [instruction, setInstruction] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accRef = useRef('');

  const canGenerate = !!provider && title.trim().length > 0;
  const disabledReason = !provider
    ? 'Add an AI key in Settings → AI Keys to use this'
    : title.trim().length === 0
      ? 'Add a title first'
      : undefined;

  // baseDraft = the text the AI should improve (the user's current/edited draft, or '' for a fresh
  // generation). withInstruction = an optional "make it bolder" style revision request.
  const generate = useCallback(async (withInstruction: string, baseDraft: string) => {
    if (!provider || !title.trim() || streaming) return;
    setStreaming(true);
    setError(null);
    accRef.current = '';
    setDraft('');
    await streamPost(
      '/api/ai/guide-hook',
      {
        provider,
        title: title.trim(),
        currentDraft: baseDraft.trim() || undefined,
        instruction: withInstruction.trim() || undefined,
        city: city.trim() || undefined,
        region: region.trim() || undefined,
      },
      token,
      (chunk) => { accRef.current += chunk; setDraft(accRef.current); },
      undefined,
      (status) => {
        setError(
          status === 400 ? 'No AI key configured. Add one in Settings → AI Keys.'
          : status === 401 ? 'Your session expired. Please sign in again.'
          : 'Could not generate a hook. Please try again.',
        );
      },
    );
    setStreaming(false);
  }, [provider, title, city, region, token, streaming]);

  if (!open) {
    return (
      <button
        type="button"
        disabled={!canGenerate}
        title={disabledReason}
        onClick={() => { setOpen(true); setInstruction(''); generate('', currentDescription); }}
        className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-ig-border px-3 py-1.5 text-xs font-semibold text-ig-text-secondary transition-colors hover:border-ig-blue hover:text-ig-blue disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span aria-hidden>✨</span> Add a hook — what makes this guide unmissable?
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-md border border-ig-border bg-ig-secondary p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-ig-text-secondary">
          <span aria-hidden>✨</span> AI hook
        </span>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-ig-text-tertiary hover:text-ig-text-primary">
          Close
        </button>
      </div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={4}
        placeholder={streaming ? 'Writing…' : 'The AI draft appears here — edit it freely, then Apply or Resend.'}
        className="w-full resize-none rounded-md border border-ig-border bg-ig-primary px-3 py-2 text-sm text-ig-text-primary placeholder:text-ig-text-tertiary focus:border-ig-blue focus:outline-none"
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="Tell the AI what to change (optional)…"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); generate(instruction, draft); } }}
          className="min-w-0 flex-1 rounded-md border border-ig-border bg-ig-primary px-3 py-1.5 text-xs text-ig-text-primary placeholder:text-ig-text-tertiary focus:border-ig-blue focus:outline-none"
        />
        <button type="button" disabled={streaming} onClick={() => generate(instruction, draft)}
          className="rounded-md border border-ig-border px-3 py-1.5 text-xs font-semibold text-ig-text-secondary hover:border-ig-blue hover:text-ig-blue disabled:opacity-50">
          {streaming ? 'Generating…' : 'Resend'}
        </button>
        <button type="button" disabled={streaming} onClick={() => { setInstruction(''); generate('', ''); }}
          className="rounded-md border border-ig-border px-3 py-1.5 text-xs font-semibold text-ig-text-secondary hover:border-ig-blue hover:text-ig-blue disabled:opacity-50">
          Regenerate
        </button>
        <button type="button" disabled={streaming || !draft.trim()} onClick={() => { onApply(draft.trim()); setOpen(false); }}
          className="rounded-md bg-ig-blue px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
          Apply
        </button>
      </div>
    </div>
  );
}

export default function GuideMetadataForm({ data, onChange, onPatch, tagInput, onTagInputChange, onAddTag, onRemoveTag, token, aiKeys = [] }: Props) {
  // Single-field write via the functional patch (immune to stale snapshots).
  const update = (field: string, value: unknown) => {
    onPatch({ [field]: value } as Partial<GuideUpdateRequest>);
  };

  // Reverse-geocode result → fill the LABEL fields only (city/region/country).
  // Coords are intentionally left alone: the pin is already where the user
  // clicked/dragged/located, and we don't want to snap it to the city centroid.
  const applyPlaceLabels = (place: GeoPlace) => {
    onPatch({
      primaryCity: place.city ?? place.placeName,
      ...(place.region ? { region: place.region } : {}),
      ...(place.country ? { country: place.country } : {}),
    });
  };

  // City autocomplete selection → fill labels AND move the pin to the city, in
  // one merge.
  const applyPlaceWithCoords = (place: GeoPlace) => {
    onPatch({
      primaryCity: place.city ?? place.placeName,
      latitude: roundCoord(place.latitude),
      longitude: roundCoord(place.longitude),
      ...(place.region ? { region: place.region } : {}),
      ...(place.country ? { country: place.country } : {}),
    });
  };

  const guideData = data as GuideUpdateRequest;

  // One-tap geolocate: set coords (the destination map recenters via its prop
  // effect) and reverse-geocode to prefill city/region/country.
  const [locating, setLocating] = useState(false);
  const useMyLocation = async () => {
    setLocating(true);
    const coords = await getCurrentCoords();
    setLocating(false);
    if (!coords) return;
    onPatch({ latitude: roundCoord(coords.latitude), longitude: roundCoord(coords.longitude) });
    const place = await reverseGeocode(coords.latitude, coords.longitude);
    if (place) applyPlaceLabels(place);
  };

  const description = data.description ?? '';
  const descWordCount = description.trim().split(/\s+/).filter(Boolean).length;

  const descHints = useMemo(() => {
    const hints: string[] = [];
    // The "Add a hook" prompt is now the clickable AI generator below, not a passive hint.
    const match = description.match(GENERIC_ADJECTIVES);
    if (match) hints.push(`Replace "${match[0]}" with sensory detail — what does it smell/sound/feel like?`);
    const hasHook = /\?|why|secret|skip|instead|actually|surprising|unlike/i.test(description);
    if (descWordCount >= 15 && !hasHook) hints.push('Make it bolder — add a surprising angle or contrarian take.');
    return hints;
  }, [description, descWordCount]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-ig-text-secondary mb-1">Title *</label>
        <input
          type="text"
          value={data.title || ''}
          onChange={(e) => update('title', e.target.value)}
          placeholder="e.g. 3 Days in Tokyo"
          className="min-h-11 w-full rounded-md border border-ig-border bg-ig-secondary px-3 py-2 text-base text-ig-text-primary placeholder:text-ig-text-tertiary focus:border-ig-blue focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-ig-text-secondary mb-1">Description</label>
        <textarea
          value={data.description || ''}
          onChange={(e) => update('description', e.target.value)}
          placeholder="Describe your travel guide..."
          rows={3}
          className="w-full resize-none rounded-md border border-ig-border bg-ig-secondary px-3 py-2 text-base text-ig-text-primary placeholder:text-ig-text-tertiary focus:border-ig-blue focus:outline-none"
        />
        {descHints.length > 0 && (
          <div className="mt-1.5 space-y-1">
            {descHints.map((hint) => (
              <p key={hint} className="text-xs text-amber-400 flex items-start gap-1.5">
                <span className="flex-shrink-0">✨</span>
                {hint}
              </p>
            ))}
          </div>
        )}
        <HookGenerator
          title={data.title || ''}
          currentDescription={data.description || ''}
          city={data.primaryCity || ''}
          region={data.region || ''}
          token={token}
          provider={aiKeys[0]?.provider ?? null}
          onApply={(text) => onPatch({ description: text })}
        />
      </div>

      {MAPBOX_TOKEN && (
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="inline-flex min-h-11 items-center gap-2 rounded-md border border-ig-border bg-ig-elevated px-3 py-2 text-sm font-semibold text-ig-text-primary transition-colors hover:bg-ig-hover disabled:opacity-60"
        >
          <span aria-hidden>📍</span>
          {locating ? 'Locating…' : 'Use my current location'}
        </button>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-semibold text-ig-text-secondary mb-1">Region</label>
          <input
            type="text"
            value={data.region || ''}
            onChange={(e) => update('region', e.target.value)}
            placeholder="e.g. East Asia"
            className="min-h-11 w-full rounded-md border border-ig-border bg-ig-secondary px-3 py-2 text-base text-ig-text-primary placeholder:text-ig-text-tertiary focus:border-ig-blue focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ig-text-secondary mb-1">Primary City</label>
          <CityAutocomplete
            value={data.primaryCity || ''}
            onType={(text) => update('primaryCity', text)}
            onSelect={applyPlaceWithCoords}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-semibold text-ig-text-secondary mb-1">Country</label>
          <input
            type="text"
            value={data.country || ''}
            onChange={(e) => update('country', e.target.value)}
            placeholder="e.g. Japan"
            className="min-h-11 w-full rounded-md border border-ig-border bg-ig-secondary px-3 py-2 text-base text-ig-text-primary placeholder:text-ig-text-tertiary focus:border-ig-blue focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ig-text-secondary mb-1">Timezone</label>
          <input
            type="text"
            value={data.timezone || ''}
            onChange={(e) => update('timezone', e.target.value)}
            placeholder="e.g. Europe/Tbilisi"
            className="min-h-11 w-full rounded-md border border-ig-border bg-ig-secondary px-3 py-2 text-base text-ig-text-primary placeholder:text-ig-text-tertiary focus:border-ig-blue focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ig-text-secondary mb-1">Price (cents)</label>
          <input
            type="number"
            value={data.priceCents || 0}
            onChange={(e) => update('priceCents', parseInt(e.target.value) || 0)}
            min={0}
            className="min-h-11 w-full rounded-md border border-ig-border bg-ig-secondary px-3 py-2 text-base text-ig-text-primary focus:border-ig-blue focus:outline-none"
          />
        </div>
      </div>

      {(data.priceCents ?? 0) > 0 && (
        <div className="rounded-lg border border-ig-border bg-ig-secondary/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-ig-text-secondary">Discount / Sale</span>
            {(data as GuideUpdateRequest).salePriceCents != null && (
              <button
                type="button"
                onClick={() => onPatch({ salePriceCents: null, saleEndsAt: null })}
                className="text-xs text-ig-text-tertiary hover:text-ig-error transition-colors"
              >
                Clear discount
              </button>
            )}
          </div>
          <div>
            <label className="block text-xs text-ig-text-tertiary mb-1">Sale price (cents) — leave blank or 0 to disable</label>
            <input
              type="number"
              value={(data as GuideUpdateRequest).salePriceCents ?? ''}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                const price = isNaN(val) || val <= 0 ? null : val;
                onPatch({ salePriceCents: price, saleEndsAt: price == null ? null : (data as GuideUpdateRequest).saleEndsAt ?? null });
              }}
              min={0}
              placeholder="e.g. 500 for $5.00"
              className="min-h-11 w-full rounded-md border border-ig-border bg-ig-secondary px-3 py-2 text-base text-ig-text-primary placeholder:text-ig-text-tertiary focus:border-ig-blue focus:outline-none"
            />
          </div>
          {(data as GuideUpdateRequest).salePriceCents != null && (data as GuideUpdateRequest).salePriceCents! > 0 && (
            <div>
              <label className="block text-xs text-ig-text-tertiary mb-1">Sale ends (optional)</label>
              <input
                type="datetime-local"
                value={(data as GuideUpdateRequest).saleEndsAt ? (data as GuideUpdateRequest).saleEndsAt!.slice(0, 16) : ''}
                onChange={(e) => update('saleEndsAt', e.target.value ? new Date(e.target.value).toISOString() : null)}
                className="min-h-11 w-full rounded-md border border-ig-border bg-ig-secondary px-3 py-2 text-base text-ig-text-primary focus:border-ig-blue focus:outline-none"
              />
            </div>
          )}
        </div>
      )}

      <ImageUploadField
        token={token}
        usage="GUIDE_COVER"
        label="Cover image"
        value={data.coverImageUrl || ''}
        onChange={(url) => update('coverImageUrl', url)}
        previewShape="wide"
        helpText="Landscape images work best for guide cards and previews."
      />

      <div>
        <label className="block text-sm font-semibold text-ig-text-secondary mb-1">Traveler stage</label>
        <select
          value={(data as GuideUpdateRequest).travelerStage ?? ''}
          onChange={(e) => update('travelerStage', e.target.value || null)}
          className="min-h-11 w-full rounded-md border border-ig-border bg-ig-secondary px-3 py-2 text-base text-ig-text-primary focus:border-ig-blue focus:outline-none md:text-sm"
        >
          <option value="">— any stage —</option>
          <option value="DREAMING">Dreaming — inspiring wanderlust</option>
          <option value="PLANNING">Planning — helping book the trip</option>
          <option value="EXPERIENCING">Experiencing — use while traveling</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-ig-text-secondary mb-1">Traveler personas</label>
        <div className="flex flex-wrap gap-2">
          {(['SOLO', 'FAMILY', 'BUDGET', 'LUXURY', 'DIGITAL_NOMAD'] as const).map((persona) => {
            const selected = ((data as GuideUpdateRequest).personas ?? []).includes(persona);
            return (
              <button
                key={persona}
                type="button"
                onClick={() => {
                  const current = (data as GuideUpdateRequest).personas ?? [];
                  update('personas', selected ? current.filter((p) => p !== persona) : [...current, persona]);
                }}
                className={`min-h-11 rounded-full border px-4 py-2 text-sm font-semibold transition-colors lg:min-h-0 lg:px-3 lg:py-1.5 lg:text-xs ${
                  selected
                    ? 'border-brand-500 bg-brand-500/15 text-brand-400'
                    : 'border-ig-border bg-ig-secondary text-ig-text-secondary hover:border-brand-500/40'
                }`}
              >
                {persona === 'DIGITAL_NOMAD' ? 'Digital Nomad' : persona.charAt(0) + persona.slice(1).toLowerCase()}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-ig-text-secondary mb-1">Best time to visit</label>
        <p className="text-xs text-ig-text-tertiary mb-2">Shown as a badge on your guide to signal when to book.</p>
        <div className="mb-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs text-ig-text-tertiary mb-1">From month</label>
            <select
              value={(data as GuideUpdateRequest).bestSeasonStartMonth ?? ''}
              onChange={(e) => update('bestSeasonStartMonth', e.target.value ? parseInt(e.target.value) : null)}
              className="min-h-11 w-full rounded-md border border-ig-border bg-ig-secondary px-3 py-2 text-base text-ig-text-primary focus:border-ig-blue focus:outline-none md:text-sm"
            >
              <option value="">— any —</option>
              {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-ig-text-tertiary mb-1">To month</label>
            <select
              value={(data as GuideUpdateRequest).bestSeasonEndMonth ?? ''}
              onChange={(e) => update('bestSeasonEndMonth', e.target.value ? parseInt(e.target.value) : null)}
              className="min-h-11 w-full rounded-md border border-ig-border bg-ig-secondary px-3 py-2 text-base text-ig-text-primary focus:border-ig-blue focus:outline-none md:text-sm"
            >
              <option value="">— any —</option>
              {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
        </div>
        <input
          type="text"
          value={(data as GuideUpdateRequest).bestSeasonLabel ?? ''}
          onChange={(e) => update('bestSeasonLabel', e.target.value || null)}
          placeholder="e.g. Spring cherry blossom season"
          maxLength={60}
          className="min-h-11 w-full rounded-md border border-ig-border bg-ig-secondary px-3 py-2 text-base text-ig-text-primary placeholder:text-ig-text-tertiary focus:border-ig-blue focus:outline-none md:text-sm"
        />
      </div>

      {MAPBOX_TOKEN && (
        <div>
          <label className="block text-sm font-semibold text-ig-text-secondary mb-1">Destination pin</label>
          <p className="text-xs text-ig-text-tertiary mb-2">Tap &ldquo;Use my current location&rdquo;, search a city above, or click/drag the pin. The city, region and country fill in automatically.</p>
          <DestinationMap
            lat={guideData.latitude}
            lng={guideData.longitude}
            onChange={(lat, lng) => onPatch({ latitude: lat, longitude: lng })}
            onResolvePlace={applyPlaceLabels}
          />
          {guideData.latitude != null && guideData.longitude != null && (
            <p className="text-xs text-ig-text-tertiary mt-1">{guideData.latitude}, {guideData.longitude}</p>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-ig-text-secondary mb-1">Tags</label>
        <div className="flex gap-2 mb-2 flex-wrap">
          {(data.tags || []).map((tag) => (
            <span key={tag} className="inline-flex min-h-11 items-center gap-1 rounded-pill border border-ig-border bg-ig-elevated px-3 py-1 text-sm text-ig-text-primary lg:min-h-9 lg:px-2">
              {tag}
              <button onClick={() => onRemoveTag(tag)} className="ml-1 inline-flex min-h-9 min-w-9 items-center justify-center text-ig-text-tertiary hover:text-ig-error lg:min-h-0 lg:min-w-0">&times;</button>
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => onTagInputChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAddTag(); } }}
            placeholder="Add a tag..."
            className="min-h-11 min-w-0 flex-1 rounded-md border border-ig-border bg-ig-secondary px-3 py-2 text-base text-ig-text-primary placeholder:text-ig-text-tertiary focus:border-ig-blue focus:outline-none"
          />
          <button onClick={onAddTag} className="mw-button-primary min-h-11 rounded-md px-4 py-2 text-sm">Add</button>
        </div>
      </div>
    </div>
  );
}
