'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Map as LeafletMap, Marker as LeafletMarker, LeafletMouseEvent } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PLACE_IMAGE_MAX_COUNT } from '@/lib/config';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { rasterTileUrl, useMapboxStyle } from '@/lib/mapboxStyle';
import { searchPlaces, reverseGeocodeAddress, type GeoPoi } from '@/lib/geocode';
import { minutesToHHMM, hhmmToMinutes } from '@/lib/time';
import { rankSuggestedTags } from '@/lib/placeTags';
import { searchWebImages, unsplashConfigured, urlToFile, type WebImage } from '@/lib/unsplash';
import { capturePhoto } from '@/lib/camera';
import type { GuidePlace, GuidePlaceRequest, MediaUsage } from '@/types';
import { useGuideEdit } from './GuideEditContext';

const SUGGESTED_TAGS = [
  'museum', 'art gallery', 'park', 'restaurant', 'cafe', 'bar',
  'historic site', 'viewpoint', 'beach', 'market', 'shopping', 'nature',
  'temple', 'church', 'nightlife', 'entertainment',
];

const DURATION_PRESETS = [15, 30, 45, 60, 90];
const DEFAULT_DURATION = 60;
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_PUBLIC_TOKEN ?? '';
const MAPS_BASE = 'https://brooksweb.uk/maps';

interface Props {
  blockId: string;
  place: GuidePlace;
  // Sequential default: the previous place's end time (start + duration) in
  // minutes-from-midnight, so a new place pre-fills its Start Time.
  defaultStartMinute?: number | null;
}

interface PlaceFormState {
  name: string;
  description: string;
  address: string;
  latStr: string;
  lngStr: string;
  suggestedStartMinute: string;
  suggestedDurationMinutes: string;
  imageUrls: string[];
  tags: string[];
  tagInput: string;
}

function initialFormState(place: GuidePlace, defaultStartMinute?: number | null): PlaceFormState {
  const start = place.suggestedStartMinute ?? (defaultStartMinute != null ? defaultStartMinute : null);
  const duration = place.suggestedDurationMinutes ?? DEFAULT_DURATION;
  return {
    name: place.name,
    description: place.description || '',
    address: place.address || '',
    latStr: place.latitude?.toString() || '',
    lngStr: place.longitude?.toString() || '',
    suggestedStartMinute: start != null ? String(start) : '',
    suggestedDurationMinutes: String(duration),
    imageUrls: place.images.map((img) => img.imageUrl),
    tags: place.tags ?? [],
    tagInput: '',
  };
}

// ── Place name / address autocomplete (Mapbox) ────────────────────────────
function PlaceSearchInput({ value, placeholder, kinds, onType, onSelect }: {
  value: string;
  placeholder: string;
  kinds: string;
  onType: (text: string) => void;
  onSelect: (poi: GeoPoi) => void;
}) {
  const [suggestions, setSuggestions] = useState<GeoPoi[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<number | null>(null);

  const handleInput = (text: string) => {
    onType(text);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (text.trim().length < 2) { setSuggestions([]); setOpen(false); return; }
    debounceRef.current = window.setTimeout(async () => {
      const r = await searchPlaces(text, kinds);
      setSuggestions(r);
      setOpen(r.length > 0);
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
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="min-h-11 w-full rounded border border-ig-border bg-ig-secondary px-3 py-2 text-base text-ig-text-primary placeholder:text-ig-text-tertiary focus:border-ig-blue focus:outline-none md:text-sm"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-ig-border bg-ig-elevated shadow-lg">
          {suggestions.map((s) => (
            <li key={`${s.name}-${s.latitude}-${s.longitude}`}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onSelect(s); setOpen(false); }}
                className="block w-full px-3 py-2 text-left transition-colors hover:bg-ig-hover"
              >
                <span className="block text-sm font-medium text-ig-text-primary">{s.name}</span>
                <span className="block truncate text-xs text-ig-text-tertiary">{s.address}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Pick-on-map modal (Leaflet raster, no WebGL) ──────────────────────────
function MapPickerModal({ initialLat, initialLng, onPick, onClose }: {
  initialLat: number | null;
  initialLng: number | null;
  onPick: (lat: number, lng: number, address: string | null) => void;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const { t } = useTranslation();
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(
    initialLat != null && initialLng != null ? { lat: initialLat, lng: initialLng } : null,
  );
  const [saving, setSaving] = useState(false);
  const mapboxStyle = useMapboxStyle();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !containerRef.current) return;
      const center: [number, number] = initialLat != null && initialLng != null ? [initialLat, initialLng] : [20, 0];
      const map = L.map(containerRef.current, {
        center,
        zoom: initialLat != null ? 13 : 2,
        zoomControl: true,
        attributionControl: true,
        zoomSnap: 0.5,
      });
      mapRef.current = map;
      L.tileLayer(rasterTileUrl(mapboxStyle, MAPBOX_TOKEN), {
        tileSize: 512, zoomOffset: -1, minZoom: 1, maxZoom: 20, crossOrigin: true,
        attribution: '© Mapbox © OpenStreetMap',
      }).addTo(map);

      const icon = L.divIcon({
        html: '<div style="width:22px;height:22px;border-radius:9999px;background:#3b82f6;border:3px solid #fff;box-shadow:0 4px 10px rgba(0,0,0,0.35)"></div>',
        className: '', iconSize: [22, 22], iconAnchor: [11, 11],
      });
      if (initialLat != null && initialLng != null) {
        markerRef.current = L.marker([initialLat, initialLng], { icon }).addTo(map);
      }
      map.on('click', (e: LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
        else markerRef.current = L.marker([lat, lng], { icon }).addTo(map);
        setPicked({ lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 });
      });
      map.whenReady(() => {
        if (cancelled) return;
        map.invalidateSize();
        requestAnimationFrame(() => { if (!cancelled) map.invalidateSize(); });
      });
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const confirm = async () => {
    if (!picked) return;
    setSaving(true);
    const address = await reverseGeocodeAddress(picked.lat, picked.lng);
    setSaving(false);
    onPick(picked.lat, picked.lng, address);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-ig-primary">
      <div className="flex items-center justify-between border-b border-ig-border px-4 py-3">
        <h2 className="text-sm font-semibold text-ig-text-primary">{t('guideEditor.mapPicker.title')}</h2>
        <button type="button" onClick={onClose} className="min-h-11 rounded px-3 text-sm text-ig-text-tertiary hover:text-ig-text-primary">{t('guideEditor.mapPicker.close')}</button>
      </div>
      <p className="px-4 pt-2 text-xs text-ig-text-tertiary">{t('guideEditor.mapPicker.hint')}</p>
      <div ref={containerRef} className="m-4 flex-1 overflow-hidden rounded-lg border border-ig-border" />
      <div className="flex items-center justify-between gap-3 border-t border-ig-border px-4 py-3">
        <span className="text-xs text-ig-text-tertiary">{picked ? `${picked.lat}, ${picked.lng}` : t('guideEditor.mapPicker.noPointSelected')}</span>
        <button
          type="button"
          onClick={confirm}
          disabled={!picked || saving}
          className="mw-button-primary min-h-11 rounded px-5 text-sm disabled:opacity-60"
        >
          {saving ? t('guideEditor.mapPicker.setting') : t('guideEditor.mapPicker.setLocation')}
        </button>
      </div>
    </div>
  );
}

// ── Photo source sheet: Capture / Library / Web (Unsplash) ─────────────────
function PhotoSheet({ placeName, token, onAddUrl, onClose }: {
  placeName: string;
  token: string;
  onAddUrl: (url: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [webMode, setWebMode] = useState(false);
  const [webResults, setWebResults] = useState<WebImage[]>([]);
  const [webLoading, setWebLoading] = useState(false);

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const r = await api.uploadMedia(file, 'PLACE_IMAGE' as MediaUsage, token);
      onAddUrl(r.url);
      toast.success(t('guideEditor.photoSheet.photoAdded'));
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('guideEditor.photoSheet.uploadFailed'));
    } finally {
      setBusy(false);
    }
  };

  const handleCapture = async () => {
    const file = await capturePhoto();
    if (file) { void upload(file); return; }
    // Web / no native camera → fall back to a capture-enabled file input.
    fileRef.current?.click();
  };

  const handleLibrary = () => fileRef.current?.click();

  const openWeb = async () => {
    setWebMode(true);
    setWebLoading(true);
    setWebResults(await searchWebImages(placeName || 'travel'));
    setWebLoading(false);
  };

  const pickWeb = async (img: WebImage) => {
    setBusy(true);
    try {
      const file = await urlToFile(img.fullUrl, `web-${img.id}`);
      await upload(file);
    } catch {
      toast.error(t('guideEditor.photoSheet.imageAddFailed'));
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl border border-ig-border bg-ig-elevated p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ig-text-primary">{webMode ? t('guideEditor.photoSheet.webSuggestions') : t('guideEditor.photoSheet.addPhoto')}</h3>
          <button type="button" onClick={onClose} className="min-h-11 rounded px-3 text-sm text-ig-text-tertiary hover:text-ig-text-primary">{t('guideEditor.photoSheet.close')}</button>
        </div>

        {!webMode ? (
          <div className="grid grid-cols-1 gap-2">
            <button type="button" disabled={busy} onClick={handleCapture} className="min-h-12 rounded-lg border border-ig-border bg-ig-secondary px-4 text-sm font-semibold text-ig-text-primary hover:bg-ig-hover disabled:opacity-60">📷 {t('guideEditor.photoSheet.capture')}</button>
            <button type="button" disabled={busy} onClick={handleLibrary} className="min-h-12 rounded-lg border border-ig-border bg-ig-secondary px-4 text-sm font-semibold text-ig-text-primary hover:bg-ig-hover disabled:opacity-60">🖼️ {t('guideEditor.photoSheet.openLibrary')}</button>
            <button
              type="button"
              disabled={busy || !unsplashConfigured()}
              onClick={openWeb}
              title={unsplashConfigured() ? undefined : t('guideEditor.photoSheet.webNeedsKeyTitle')}
              className="min-h-12 rounded-lg border border-ig-border bg-ig-secondary px-4 text-sm font-semibold text-ig-text-primary hover:bg-ig-hover disabled:opacity-60"
            >
              🌐 {unsplashConfigured() ? t('guideEditor.photoSheet.selectFromWeb') : t('guideEditor.photoSheet.selectFromWebNeedsKey')}
            </button>
          </div>
        ) : (
          <div>
            {webLoading ? (
              <p className="py-6 text-center text-sm text-ig-text-tertiary">{t('guideEditor.photoSheet.searching')}</p>
            ) : webResults.length === 0 ? (
              <p className="py-6 text-center text-sm text-ig-text-tertiary">{t('guideEditor.photoSheet.noImagesFound', { name: placeName })}</p>
            ) : (
              <div className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto">
                {webResults.map((img) => (
                  <button key={img.id} type="button" disabled={busy} onClick={() => pickWeb(img)} className="relative aspect-square overflow-hidden rounded-md border border-ig-border disabled:opacity-60">
                    <img src={img.thumbUrl} alt={t('guideEditor.photoSheet.imgAlt', { author: img.authorName })} loading="lazy" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            <button type="button" onClick={() => setWebMode(false)} className="mt-3 min-h-11 w-full rounded border border-ig-border text-sm text-ig-text-secondary hover:text-ig-text-primary">← {t('guideEditor.photoSheet.back')}</button>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); if (fileRef.current) fileRef.current.value = ''; }}
        />
      </div>
    </div>
  );
}

export default function PlaceCard({ blockId, place, defaultStartMinute }: Props) {
  const { t } = useTranslation();
  const { token, updatePlace, deletePlace } = useGuideEdit();
  const [editing, setEditing] = useState(false);
  const [editingLocation, setEditingLocation] = useState(false);
  const [mapPicker, setMapPicker] = useState(false);
  const [photoSheet, setPhotoSheet] = useState(false);

  const [form, setForm] = useState<PlaceFormState>(() => initialFormState(place, defaultStartMinute));
  const update = <K extends keyof PlaceFormState>(key: K, value: PlaceFormState[K]) =>
    setForm((s) => ({ ...s, [key]: value }));

  // Heuristic: reorder the suggested-tag pills so ones relevant to the place
  // name come first (e.g. "Theatre" → entertainment/nightlife/historic site).
  const rankedTags = useMemo(
    () => rankSuggestedTags(form.name, SUGGESTED_TAGS).filter((t) => !form.tags.includes(t)),
    [form.name, form.tags],
  );

  const addTag = (tag: string) => {
    const t = tag.trim().toLowerCase();
    if (!t || form.tags.includes(t)) return;
    setForm((s) => ({ ...s, tags: [...s.tags, t], tagInput: '' }));
  };
  const removeTag = (tag: string) =>
    setForm((s) => ({ ...s, tags: s.tags.filter((t) => t !== tag) }));

  const buildRequest = (): GuidePlaceRequest => ({
    name: form.name,
    description: form.description || undefined,
    address: form.address || undefined,
    latitude: form.latStr ? Number(form.latStr) : undefined,
    longitude: form.lngStr ? Number(form.lngStr) : undefined,
    suggestedStartMinute: form.suggestedStartMinute ? Number(form.suggestedStartMinute) : undefined,
    suggestedDurationMinutes: form.suggestedDurationMinutes ? Number(form.suggestedDurationMinutes) : undefined,
    imageUrls: form.imageUrls,
    tags: form.tags,
  });

  const handleSave = () => {
    updatePlace(place.id, buildRequest());
    setEditing(false);
  };

  const handleSaveLocation = () => {
    updatePlace(place.id, {
      name: place.name,
      imageUrls: place.images.map((i) => i.imageUrl),
      tags: place.tags ?? [],
      latitude: form.latStr ? Number(form.latStr) : undefined,
      longitude: form.lngStr ? Number(form.lngStr) : undefined,
    });
    setEditingLocation(false);
  };

  // Apply a geocoded result: a POI sets name + address + coords; an address
  // result keeps the user's name but sets address + coords.
  const applyNamePoi = (poi: GeoPoi) => setForm((s) => ({
    ...s, name: poi.name, address: poi.address, latStr: String(poi.latitude), lngStr: String(poi.longitude),
  }));
  const applyAddressPoi = (poi: GeoPoi) => setForm((s) => ({
    ...s, address: poi.address, latStr: String(poi.latitude), lngStr: String(poi.longitude),
  }));

  // ── Edit form ─────────────────────────────────────────────
  if (editing) {
    const startVal = form.suggestedStartMinute ? minutesToHHMM(Number(form.suggestedStartMinute)) : '';
    const durationNum = form.suggestedDurationMinutes ? Number(form.suggestedDurationMinutes) : null;
    return (
      <div className="rounded-lg border border-ig-border bg-ig-primary p-3 space-y-3">
        <div>
          <label className="mb-1 block text-xs text-ig-text-tertiary">{t('guideEditor.placeCard.nameLabel')}</label>
          <PlaceSearchInput
            value={form.name}
            placeholder={t('guideEditor.placeCard.namePlaceholder')}
            kinds="poi,address,place"
            onType={(text) => update('name', text)}
            onSelect={applyNamePoi}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-ig-text-tertiary">{t('guideEditor.placeCard.addressLabel')}</label>
          <PlaceSearchInput
            value={form.address}
            placeholder={t('guideEditor.placeCard.addressPlaceholder')}
            kinds="address,poi,place"
            onType={(text) => update('address', text)}
            onSelect={applyAddressPoi}
          />
        </div>

        <textarea
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          placeholder={t('guideEditor.placeCard.descriptionPlaceholder')}
          rows={2}
          className="w-full rounded border border-ig-border bg-ig-secondary px-3 py-2 text-base text-ig-text-primary resize-none focus:border-ig-blue focus:outline-none md:text-sm"
        />

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setMapPicker(true)} className="min-h-11 rounded border border-ig-border px-3 text-sm text-ig-text-secondary hover:border-ig-blue hover:text-ig-blue">
            📍 {t('guideEditor.placeCard.chooseOnMap')}
          </button>
          <span className="text-xs text-ig-text-tertiary">
            {form.latStr && form.lngStr ? `${form.latStr}, ${form.lngStr}` : t('guideEditor.placeCard.noCoords')}
          </span>
        </div>

        {/* Start Time (native spinner) + duration presets */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs text-ig-text-tertiary">{t('guideEditor.placeCard.startTime')}</label>
            <input
              type="time"
              value={startVal}
              onChange={(e) => {
                const min = hhmmToMinutes(e.target.value);
                update('suggestedStartMinute', min != null ? String(min) : '');
              }}
              className="min-h-11 w-full rounded border border-ig-border bg-ig-secondary px-3 py-2 text-base text-ig-text-primary focus:border-ig-blue focus:outline-none md:text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-ig-text-tertiary">{t('guideEditor.placeCard.duration')}</label>
            <div className="flex flex-wrap gap-1.5">
              {DURATION_PRESETS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => update('suggestedDurationMinutes', String(d))}
                  className={`min-h-9 rounded-pill border px-2.5 text-xs font-semibold transition-colors ${
                    durationNum === d
                      ? 'border-brand-500 bg-brand-500/15 text-brand-500'
                      : 'border-ig-border bg-ig-secondary text-ig-text-secondary hover:border-ig-blue hover:text-ig-blue'
                  }`}
                >
                  {d}m
                </button>
              ))}
              <input
                type="number"
                min={1}
                value={form.suggestedDurationMinutes}
                onChange={(e) => update('suggestedDurationMinutes', e.target.value)}
                placeholder="min"
                className="min-h-9 w-16 rounded border border-ig-border bg-ig-secondary px-2 text-sm text-ig-text-primary focus:border-ig-blue focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs text-ig-text-tertiary mb-1.5">{t('guideEditor.placeCard.tagsLabel')}</p>
          {form.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 rounded-pill bg-ig-elevated border border-ig-border px-2 py-0.5 text-xs text-ig-text-primary">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="text-ig-text-tertiary hover:text-ig-error">&times;</button>
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {rankedTags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => addTag(t)}
                className="rounded-pill border border-ig-border bg-ig-secondary px-2 py-0.5 text-xs text-ig-text-secondary hover:border-ig-blue hover:text-ig-blue transition-colors"
              >
                + {t}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={form.tagInput}
              onChange={(e) => update('tagInput', e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(form.tagInput); } }}
              placeholder={t('guideEditor.placeCard.customTagPlaceholder')}
              className="min-h-11 min-w-0 flex-1 rounded border border-ig-border bg-ig-secondary px-3 py-2 text-base text-ig-text-primary placeholder:text-ig-text-tertiary focus:border-ig-blue focus:outline-none md:text-sm"
            />
            <button type="button" onClick={() => addTag(form.tagInput)} className="min-h-11 rounded border border-ig-border px-3 text-sm text-ig-text-secondary hover:border-ig-blue hover:text-ig-blue">
              {t('guideEditor.placeCard.addTagBtn')}
            </button>
          </div>
        </div>

        {/* Photos: thumbnail grid + contextual source sheet */}
        <div>
          <p className="text-xs text-ig-text-tertiary mb-1.5">{t('guideEditor.placeCard.photosLabel', { count: form.imageUrls.length, max: PLACE_IMAGE_MAX_COUNT })}</p>
          {form.imageUrls.length > 0 && (
            <div className="mb-2 grid grid-cols-4 gap-2">
              {form.imageUrls.map((url) => (
                <div key={url} className="relative aspect-square overflow-hidden rounded-md border border-ig-border">
                  <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => update('imageUrls', form.imageUrls.filter((u) => u !== url))}
                    className="absolute right-1 top-1 rounded bg-black/70 px-1.5 text-xs font-semibold text-white"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          {form.imageUrls.length < PLACE_IMAGE_MAX_COUNT && (
            <button type="button" onClick={() => setPhotoSheet(true)} className="min-h-11 rounded border border-ig-border px-4 text-sm font-semibold text-ig-text-primary hover:bg-ig-hover">
              + {t('guideEditor.placeCard.addPhotoBtn')}
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={handleSave} className="mw-button-primary min-h-11 rounded px-4 py-2 text-sm">{t('guideEditor.placeCard.saveBtn')}</button>
          <button onClick={() => setEditing(false)} className="min-h-11 rounded px-4 py-2 text-sm text-ig-text-secondary">{t('guideEditor.placeCard.cancelBtn')}</button>
        </div>

        {mapPicker && (
          <MapPickerModal
            initialLat={form.latStr ? Number(form.latStr) : null}
            initialLng={form.lngStr ? Number(form.lngStr) : null}
            onPick={(lat, lng, address) => setForm((s) => ({
              ...s,
              latStr: String(lat),
              lngStr: String(lng),
              address: address ?? s.address,
            }))}
            onClose={() => setMapPicker(false)}
          />
        )}
        {photoSheet && (
          <PhotoSheet
            placeName={form.name}
            token={token}
            onAddUrl={(url) => update('imageUrls', [...form.imageUrls, url].slice(0, PLACE_IMAGE_MAX_COUNT))}
            onClose={() => setPhotoSheet(false)}
          />
        )}
      </div>
    );
  }

  // ── View mode ────────────────────────────────────────────
  const firstImage = place.images[0]?.imageUrl;
  const hasCoords = place.latitude !== null && place.longitude !== null;
  const mapsUrl = hasCoords ? `${MAPS_BASE}?lat=${place.latitude}&lng=${place.longitude}` : null;

  const displayTags = (place.tags ?? []).slice(0, 2);
  const extraTags = (place.tags ?? []).length > 2 ? (place.tags ?? []).length - 2 : 0;
  const tagLine = displayTags.length > 0
    ? displayTags.join(' • ') + (extraTags > 0 ? ` • +${extraTags}` : '')
    : '';

  return (
    <div className="group rounded-lg border border-ig-border bg-ig-primary overflow-hidden">
      <div className="flex gap-3 p-3">
        <div className="h-16 w-16 flex-shrink-0 rounded-lg border border-ig-border bg-ig-elevated overflow-hidden">
          {firstImage && <img src={firstImage} alt="" loading="lazy" className="h-full w-full object-cover" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-ig-text-primary truncate">{place.name}</p>
            <div className="flex items-center gap-1 flex-shrink-0">
              {mapsUrl ? (
                <a href={mapsUrl} target="_blank" rel="noreferrer" className="flex h-11 w-11 items-center justify-center rounded-full text-brand-400 transition-colors hover:bg-brand-500/10 hover:text-brand-300 lg:h-7 lg:w-7" title={t('guideEditor.placeCard.viewOnMap')}>📍</a>
              ) : (
                <button onClick={() => setEditingLocation(true)} className="flex h-11 w-11 items-center justify-center rounded-full text-ig-text-tertiary transition-colors hover:bg-ig-hover hover:text-brand-400 lg:h-7 lg:w-7" title={t('guideEditor.placeCard.setLocation')}>📍</button>
              )}
              <div className="flex opacity-100 transition-opacity [&>button]:min-h-11 [&>button]:px-3 [&>button]:text-sm lg:opacity-0 lg:group-hover:opacity-100 lg:[&>button]:min-h-9 lg:[&>button]:px-2 lg:[&>button]:text-xs">
                <button onClick={() => setEditing(true)} className="min-h-11 rounded px-3 text-sm text-ig-text-tertiary hover:text-ig-text-primary lg:min-h-9 lg:px-2 lg:text-xs">{t('guideEditor.placeCard.editBtn')}</button>
                <button onClick={() => deletePlace(blockId, place.id)} className="min-h-11 rounded px-3 text-sm text-ig-text-tertiary hover:text-ig-error lg:min-h-9 lg:px-2 lg:text-xs">✕</button>
              </div>
            </div>
          </div>
          {tagLine && <p className="mt-0.5 text-xs text-ig-text-secondary">{tagLine}</p>}
          {place.address && <p className="mt-0.5 text-xs text-ig-text-tertiary truncate">{place.address}</p>}
          {place.description && <p className="mt-1 text-xs text-ig-text-secondary line-clamp-2">{place.description}</p>}
        </div>
      </div>

      {editingLocation && (
        <div className="border-t border-ig-border px-3 pb-3 pt-2 space-y-2">
          <p className="text-xs text-ig-text-tertiary">{t('guideEditor.placeCard.setLocationCoords')}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setMapPicker(true)} className="min-h-11 rounded border border-ig-border px-3 text-sm text-ig-text-secondary hover:border-ig-blue hover:text-ig-blue lg:min-h-9 lg:px-2 lg:text-xs">📍 {t('guideEditor.placeCard.chooseOnMap')}</button>
            <input type="number" step="any" value={form.latStr} onChange={(e) => update('latStr', e.target.value)} placeholder={t('guideEditor.placeCard.latitudePlaceholder')} className="min-h-11 min-w-0 flex-1 rounded border border-ig-border bg-ig-secondary px-3 py-2 text-base text-ig-text-primary focus:border-ig-blue focus:outline-none lg:min-h-9 lg:w-32 lg:flex-none lg:px-2 lg:py-1 lg:text-xs" />
            <input type="number" step="any" value={form.lngStr} onChange={(e) => update('lngStr', e.target.value)} placeholder={t('guideEditor.placeCard.longitudePlaceholder')} className="min-h-11 min-w-0 flex-1 rounded border border-ig-border bg-ig-secondary px-3 py-2 text-base text-ig-text-primary focus:border-ig-blue focus:outline-none lg:min-h-9 lg:w-32 lg:flex-none lg:px-2 lg:py-1 lg:text-xs" />
            <button onClick={handleSaveLocation} className="mw-button-primary min-h-11 rounded px-4 text-sm lg:min-h-9 lg:px-3 lg:text-xs">{t('guideEditor.placeCard.setBtn')}</button>
            <button onClick={() => setEditingLocation(false)} className="min-h-11 rounded px-4 text-sm text-ig-text-secondary hover:text-ig-text-primary lg:min-h-9 lg:px-3 lg:text-xs">{t('guideEditor.placeCard.cancelBtn')}</button>
          </div>
        </div>
      )}

      {mapPicker && (
        <MapPickerModal
          initialLat={form.latStr ? Number(form.latStr) : (place.latitude ?? null)}
          initialLng={form.lngStr ? Number(form.lngStr) : (place.longitude ?? null)}
          onPick={(lat, lng, address) => {
            setForm((s) => ({ ...s, latStr: String(lat), lngStr: String(lng), address: address ?? s.address }));
            updatePlace(place.id, {
              name: place.name,
              imageUrls: place.images.map((i) => i.imageUrl),
              tags: place.tags ?? [],
              latitude: lat,
              longitude: lng,
              ...(address ? { address } : {}),
            });
            setEditingLocation(false);
          }}
          onClose={() => setMapPicker(false)}
        />
      )}
    </div>
  );
}
