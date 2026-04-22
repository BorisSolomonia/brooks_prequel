'use client';

import { useMemo, useEffect, useRef } from 'react';
import type { Map as MapboxMap, Marker as MapboxMarker } from 'mapbox-gl';
import type { GuideCreateRequest, GuideUpdateRequest } from '@/types';

const GENERIC_ADJECTIVES = /\b(beautiful|nice|amazing|great|wonderful|awesome|fantastic|incredible|gorgeous|lovely|perfect|excellent)\b/gi;

interface Props {
  data: GuideCreateRequest | GuideUpdateRequest;
  onChange: (data: GuideCreateRequest | GuideUpdateRequest) => void;
  tagInput: string;
  onTagInputChange: (value: string) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_PUBLIC_TOKEN ?? '';
const MAPBOX_STYLE = process.env.NEXT_PUBLIC_MAPBOX_STYLE ?? 'mapbox://styles/mapbox/streets-v12';

function DestinationMap({ lat, lng, onChange }: { lat: number | null | undefined; lng: number | null | undefined; onChange: (lat: number, lng: number) => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markerRef = useRef<MapboxMarker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !MAPBOX_TOKEN) return;
    let cancelled = false;

    const init = async () => {
      const mapboxglModule = await import('mapbox-gl');
      const mapboxgl = mapboxglModule.default;
      mapboxgl.accessToken = MAPBOX_TOKEN;
      if (cancelled || !containerRef.current) return;

      const center: [number, number] = lng != null && lat != null ? [lng, lat] : [0, 20];
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: MAPBOX_STYLE,
        center,
        zoom: lat != null ? 8 : 1,
      });
      mapRef.current = map;

      const marker = new mapboxgl.Marker({ draggable: true, color: '#3b82f6' })
        .setLngLat(center)
        .addTo(map);
      markerRef.current = marker;

      marker.on('dragend', () => {
        const pos = marker.getLngLat();
        onChange(Math.round(pos.lat * 1e6) / 1e6, Math.round(pos.lng * 1e6) / 1e6);
      });

      map.on('click', (e) => {
        marker.setLngLat(e.lngLat);
        onChange(Math.round(e.lngLat.lat * 1e6) / 1e6, Math.round(e.lngLat.lng * 1e6) / 1e6);
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

export default function GuideMetadataForm({ data, onChange, tagInput, onTagInputChange, onAddTag, onRemoveTag }: Props) {
  const update = (field: string, value: unknown) => {
    onChange({ ...data, [field]: value });
  };

  const guideData = data as GuideUpdateRequest;

  const description = data.description ?? '';
  const descWordCount = description.trim().split(/\s+/).filter(Boolean).length;

  const descHints = useMemo(() => {
    const hints: string[] = [];
    if (descWordCount < 30) hints.push('Add a hook — what makes this guide unmissable?');
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
          className="w-full px-3 py-2 bg-ig-secondary border border-ig-border rounded-md text-ig-text-primary placeholder:text-ig-text-tertiary focus:outline-none focus:border-ig-blue"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-ig-text-secondary mb-1">Description</label>
        <textarea
          value={data.description || ''}
          onChange={(e) => update('description', e.target.value)}
          placeholder="Describe your travel guide..."
          rows={3}
          className="w-full px-3 py-2 bg-ig-secondary border border-ig-border rounded-md text-ig-text-primary placeholder:text-ig-text-tertiary focus:outline-none focus:border-ig-blue resize-none"
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
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-ig-text-secondary mb-1">Region</label>
          <input
            type="text"
            value={data.region || ''}
            onChange={(e) => update('region', e.target.value)}
            placeholder="e.g. East Asia"
            className="w-full px-3 py-2 bg-ig-secondary border border-ig-border rounded-md text-ig-text-primary placeholder:text-ig-text-tertiary focus:outline-none focus:border-ig-blue"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ig-text-secondary mb-1">Primary City</label>
          <input
            type="text"
            value={data.primaryCity || ''}
            onChange={(e) => update('primaryCity', e.target.value)}
            placeholder="e.g. Tokyo"
            className="w-full px-3 py-2 bg-ig-secondary border border-ig-border rounded-md text-ig-text-primary placeholder:text-ig-text-tertiary focus:outline-none focus:border-ig-blue"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-ig-text-secondary mb-1">Country</label>
          <input
            type="text"
            value={data.country || ''}
            onChange={(e) => update('country', e.target.value)}
            placeholder="e.g. Japan"
            className="w-full px-3 py-2 bg-ig-secondary border border-ig-border rounded-md text-ig-text-primary placeholder:text-ig-text-tertiary focus:outline-none focus:border-ig-blue"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ig-text-secondary mb-1">Timezone</label>
          <input
            type="text"
            value={data.timezone || ''}
            onChange={(e) => update('timezone', e.target.value)}
            placeholder="e.g. Europe/Tbilisi"
            className="w-full px-3 py-2 bg-ig-secondary border border-ig-border rounded-md text-ig-text-primary placeholder:text-ig-text-tertiary focus:outline-none focus:border-ig-blue"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ig-text-secondary mb-1">Price (cents)</label>
          <input
            type="number"
            value={data.priceCents || 0}
            onChange={(e) => update('priceCents', parseInt(e.target.value) || 0)}
            min={0}
            className="w-full px-3 py-2 bg-ig-secondary border border-ig-border rounded-md text-ig-text-primary focus:outline-none focus:border-ig-blue"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <label className="text-sm font-semibold text-ig-text-secondary">Cover Image URL</label>
          <span className="group relative cursor-help text-ig-text-tertiary text-xs select-none">
            ℹ️
            <span className="absolute left-5 top-0 z-10 w-56 rounded-lg border border-ig-border bg-ig-elevated p-2.5 text-xs text-ig-text-secondary shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Use RAW or high-res JPEG for sharpest results. Landscape 16:9 works best for covers. Natural light only — avoid heavy filters.
            </span>
          </span>
        </div>
        <input
          type="text"
          value={data.coverImageUrl || ''}
          onChange={(e) => update('coverImageUrl', e.target.value)}
          placeholder="https://..."
          className="w-full px-3 py-2 bg-ig-secondary border border-ig-border rounded-md text-ig-text-primary placeholder:text-ig-text-tertiary focus:outline-none focus:border-ig-blue"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-ig-text-secondary mb-1">Traveler stage</label>
        <select
          value={(data as GuideUpdateRequest).travelerStage ?? ''}
          onChange={(e) => update('travelerStage', e.target.value || null)}
          className="w-full px-3 py-2 bg-ig-secondary border border-ig-border rounded-md text-ig-text-primary focus:outline-none focus:border-ig-blue text-sm"
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
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
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
        <div className="grid grid-cols-2 gap-3 mb-2">
          <div>
            <label className="block text-xs text-ig-text-tertiary mb-1">From month</label>
            <select
              value={(data as GuideUpdateRequest).bestSeasonStartMonth ?? ''}
              onChange={(e) => update('bestSeasonStartMonth', e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-3 py-2 bg-ig-secondary border border-ig-border rounded-md text-ig-text-primary focus:outline-none focus:border-ig-blue text-sm"
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
              className="w-full px-3 py-2 bg-ig-secondary border border-ig-border rounded-md text-ig-text-primary focus:outline-none focus:border-ig-blue text-sm"
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
          className="w-full px-3 py-2 bg-ig-secondary border border-ig-border rounded-md text-ig-text-primary placeholder:text-ig-text-tertiary focus:outline-none focus:border-ig-blue text-sm"
        />
      </div>

      {MAPBOX_TOKEN && (
        <div>
          <label className="block text-sm font-semibold text-ig-text-secondary mb-1">Destination pin</label>
          <p className="text-xs text-ig-text-tertiary mb-2">Click or drag the pin to set your guide&apos;s destination coordinates.</p>
          <DestinationMap
            lat={guideData.latitude}
            lng={guideData.longitude}
            onChange={(lat, lng) => { update('latitude', lat); update('longitude', lng); }}
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
            <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-ig-elevated border border-ig-border rounded-pill text-sm text-ig-text-primary">
              {tag}
              <button onClick={() => onRemoveTag(tag)} className="text-ig-text-tertiary hover:text-ig-error ml-1">&times;</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => onTagInputChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAddTag(); } }}
            placeholder="Add a tag..."
            className="flex-1 px-3 py-2 bg-ig-secondary border border-ig-border rounded-md text-ig-text-primary placeholder:text-ig-text-tertiary focus:outline-none focus:border-ig-blue"
          />
          <button onClick={onAddTag} className="px-4 py-2 bg-ig-blue text-white rounded-md text-sm font-semibold hover:bg-ig-blue-hover">Add</button>
        </div>
      </div>
    </div>
  );
}
