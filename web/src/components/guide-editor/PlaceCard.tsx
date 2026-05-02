'use client';

import { useState } from 'react';
import { ImageUploadList } from '@/components/media/ImageUploadField';
import type { GuidePlace, GuidePlaceRequest } from '@/types';

const SUGGESTED_TAGS = [
  'museum', 'art gallery', 'park', 'restaurant', 'cafe', 'bar',
  'historic site', 'viewpoint', 'beach', 'market', 'shopping', 'nature',
  'temple', 'church', 'nightlife', 'entertainment',
];

const MAPS_BASE = 'https://brooksweb.uk/maps';

interface Props {
  token: string;
  place: GuidePlace;
  onUpdate: (placeId: string, data: GuidePlaceRequest) => void;
  onDelete: (placeId: string) => void;
}

export default function PlaceCard({ token, place, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [editingLocation, setEditingLocation] = useState(false);

  // edit-form state
  const [name, setName] = useState(place.name);
  const [description, setDescription] = useState(place.description || '');
  const [address, setAddress] = useState(place.address || '');
  const [latStr, setLatStr] = useState(place.latitude?.toString() || '');
  const [lngStr, setLngStr] = useState(place.longitude?.toString() || '');
  const [suggestedStartMinute, setSuggestedStartMinute] = useState(place.suggestedStartMinute?.toString() || '');
  const [suggestedDurationMinutes, setSuggestedDurationMinutes] = useState(place.suggestedDurationMinutes?.toString() || '');
  const [imageUrls, setImageUrls] = useState(place.images.map((img) => img.imageUrl));
  const [tags, setTags] = useState<string[]>(place.tags ?? []);
  const [tagInput, setTagInput] = useState('');

  const addTag = (tag: string) => {
    const t = tag.trim().toLowerCase();
    if (!t || tags.includes(t)) return;
    setTags((prev) => [...prev, t]);
    setTagInput('');
  };
  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag));

  const buildRequest = (): GuidePlaceRequest => ({
    name,
    description: description || undefined,
    address: address || undefined,
    latitude: latStr ? Number(latStr) : undefined,
    longitude: lngStr ? Number(lngStr) : undefined,
    suggestedStartMinute: suggestedStartMinute ? Number(suggestedStartMinute) : undefined,
    suggestedDurationMinutes: suggestedDurationMinutes ? Number(suggestedDurationMinutes) : undefined,
    imageUrls,
    tags,
  });

  const handleSave = () => {
    onUpdate(place.id, buildRequest());
    setEditing(false);
  };

  const handleSaveLocation = () => {
    onUpdate(place.id, {
      name: place.name,
      imageUrls: place.images.map((i) => i.imageUrl),
      tags: place.tags ?? [],
      latitude: latStr ? Number(latStr) : undefined,
      longitude: lngStr ? Number(lngStr) : undefined,
    });
    setEditingLocation(false);
  };

  // ── Edit form ─────────────────────────────────────────────
  if (editing) {
    return (
      <div className="rounded-lg border border-ig-border bg-ig-primary p-3 space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Place name"
          className="min-h-11 w-full rounded border border-ig-border bg-ig-secondary px-3 py-2 text-base text-ig-text-primary focus:border-ig-blue focus:outline-none md:text-sm"
        />
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Address"
          className="min-h-11 w-full rounded border border-ig-border bg-ig-secondary px-3 py-2 text-base text-ig-text-primary focus:border-ig-blue focus:outline-none md:text-sm"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          rows={2}
          className="w-full rounded border border-ig-border bg-ig-secondary px-3 py-2 text-base text-ig-text-primary resize-none focus:border-ig-blue focus:outline-none md:text-sm"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            step="any"
            value={latStr}
            onChange={(e) => setLatStr(e.target.value)}
            placeholder="Latitude"
            className="min-h-11 w-full rounded border border-ig-border bg-ig-secondary px-3 py-2 text-base text-ig-text-primary focus:border-ig-blue focus:outline-none md:text-sm"
          />
          <input
            type="number"
            step="any"
            value={lngStr}
            onChange={(e) => setLngStr(e.target.value)}
            placeholder="Longitude"
            className="min-h-11 w-full rounded border border-ig-border bg-ig-secondary px-3 py-2 text-base text-ig-text-primary focus:border-ig-blue focus:outline-none md:text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min={0}
            max={1439}
            value={suggestedStartMinute}
            onChange={(e) => setSuggestedStartMinute(e.target.value)}
            placeholder="Start minute"
            className="min-h-11 w-full rounded border border-ig-border bg-ig-secondary px-3 py-2 text-base text-ig-text-primary focus:border-ig-blue focus:outline-none md:text-sm"
          />
          <input
            type="number"
            min={1}
            value={suggestedDurationMinutes}
            onChange={(e) => setSuggestedDurationMinutes(e.target.value)}
            placeholder="Duration (min)"
            className="min-h-11 w-full rounded border border-ig-border bg-ig-secondary px-3 py-2 text-base text-ig-text-primary focus:border-ig-blue focus:outline-none md:text-sm"
          />
        </div>

        <div>
          <p className="text-xs text-ig-text-tertiary mb-1.5">Tags</p>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 rounded-pill bg-ig-elevated border border-ig-border px-2 py-0.5 text-xs text-ig-text-primary">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="text-ig-text-tertiary hover:text-ig-error">&times;</button>
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {SUGGESTED_TAGS.filter((t) => !tags.includes(t)).map((t) => (
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
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput); } }}
              placeholder="Custom tag..."
              className="min-h-11 min-w-0 flex-1 rounded border border-ig-border bg-ig-secondary px-3 py-2 text-base text-ig-text-primary placeholder:text-ig-text-tertiary focus:border-ig-blue focus:outline-none md:text-sm"
            />
            <button type="button" onClick={() => addTag(tagInput)} className="min-h-11 rounded border border-ig-border px-3 text-sm text-ig-text-secondary hover:border-ig-blue hover:text-ig-blue">
              Add
            </button>
          </div>
        </div>

        <ImageUploadList
          token={token}
          usage="PLACE_IMAGE"
          label="Photos"
          values={imageUrls}
          onChange={setImageUrls}
          maxImages={4}
        />
        <div className="flex flex-wrap gap-2">
          <button onClick={handleSave} className="min-h-11 rounded bg-ig-blue px-4 py-2 text-sm font-semibold text-white">Save</button>
          <button onClick={() => setEditing(false)} className="min-h-11 rounded px-4 py-2 text-sm text-ig-text-secondary">Cancel</button>
        </div>
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
        {/* Left: photo thumbnail or gray placeholder */}
        <div className="h-16 w-16 flex-shrink-0 rounded-lg border border-ig-border bg-ig-elevated overflow-hidden">
          {firstImage && <img src={firstImage} alt="" className="h-full w-full object-cover" />}
        </div>

        {/* Right: info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-ig-text-primary truncate">{place.name}</p>
            <div className="flex items-center gap-1 flex-shrink-0">
              {mapsUrl ? (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-11 w-11 items-center justify-center rounded-full text-brand-400 transition-colors hover:bg-brand-500/10 hover:text-brand-300 lg:h-7 lg:w-7"
                  title="View on map"
                >
                  📍
                </a>
              ) : (
                <button
                  onClick={() => setEditingLocation(true)}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-ig-text-tertiary transition-colors hover:bg-ig-hover hover:text-brand-400 lg:h-7 lg:w-7"
                  title="Set location"
                >
                  📍
                </button>
              )}
              <div className="flex opacity-100 transition-opacity [&>button]:min-h-11 [&>button]:px-3 [&>button]:text-sm lg:opacity-0 lg:group-hover:opacity-100 lg:[&>button]:min-h-9 lg:[&>button]:px-2 lg:[&>button]:text-xs">
                <button onClick={() => setEditing(true)} className="min-h-11 rounded px-3 text-sm text-ig-text-tertiary hover:text-ig-text-primary lg:min-h-9 lg:px-2 lg:text-xs">Edit</button>
                <button onClick={() => onDelete(place.id)} className="min-h-11 rounded px-3 text-sm text-ig-text-tertiary hover:text-ig-error lg:min-h-9 lg:px-2 lg:text-xs">✕</button>
              </div>
            </div>
          </div>
          {tagLine && <p className="mt-0.5 text-xs text-ig-text-secondary">{tagLine}</p>}
          {place.address && <p className="mt-0.5 text-xs text-ig-text-tertiary truncate">{place.address}</p>}
          {place.description && <p className="mt-1 text-xs text-ig-text-secondary line-clamp-2">{place.description}</p>}
        </div>
      </div>

      {/* Inline location picker */}
      {editingLocation && (
        <div className="border-t border-ig-border px-3 pb-3 pt-2 space-y-2">
          <p className="text-xs text-ig-text-tertiary">Set location coordinates</p>
          <div className="flex flex-wrap gap-2">
            <input
              type="number"
              step="any"
              value={latStr}
              onChange={(e) => setLatStr(e.target.value)}
              placeholder="Latitude"
              className="min-h-11 min-w-0 flex-1 rounded border border-ig-border bg-ig-secondary px-3 py-2 text-base text-ig-text-primary focus:border-ig-blue focus:outline-none lg:min-h-9 lg:w-32 lg:flex-none lg:px-2 lg:py-1 lg:text-xs"
            />
            <input
              type="number"
              step="any"
              value={lngStr}
              onChange={(e) => setLngStr(e.target.value)}
              placeholder="Longitude"
              className="min-h-11 min-w-0 flex-1 rounded border border-ig-border bg-ig-secondary px-3 py-2 text-base text-ig-text-primary focus:border-ig-blue focus:outline-none lg:min-h-9 lg:w-32 lg:flex-none lg:px-2 lg:py-1 lg:text-xs"
            />
            <button onClick={handleSaveLocation} className="min-h-11 rounded bg-ig-blue px-4 text-sm font-semibold text-white lg:min-h-9 lg:px-3 lg:text-xs">Set</button>
            <button onClick={() => setEditingLocation(false)} className="min-h-11 rounded px-4 text-sm text-ig-text-secondary hover:text-ig-text-primary lg:min-h-9 lg:px-3 lg:text-xs">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
