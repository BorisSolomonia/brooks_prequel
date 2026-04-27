'use client';

import { useState } from 'react';
import { ImageUploadList } from '@/components/media/ImageUploadField';
import type { GuidePlace, GuidePlaceRequest } from '@/types';

const SUGGESTED_TAGS = [
  'museum', 'art gallery', 'park', 'restaurant', 'cafe', 'bar',
  'historic site', 'viewpoint', 'beach', 'market', 'shopping', 'nature',
  'temple', 'church', 'nightlife', 'entertainment',
];

interface Props {
  token: string;
  place: GuidePlace;
  onUpdate: (placeId: string, data: GuidePlaceRequest) => void;
  onDelete: (placeId: string) => void;
}

export default function PlaceCard({ token, place, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(place.name);
  const [description, setDescription] = useState(place.description || '');
  const [address, setAddress] = useState(place.address || '');
  const [suggestedStartMinute, setSuggestedStartMinute] = useState(place.suggestedStartMinute?.toString() || '');
  const [suggestedDurationMinutes, setSuggestedDurationMinutes] = useState(place.suggestedDurationMinutes?.toString() || '');
  const [imageUrls, setImageUrls] = useState(place.images.map((image) => image.imageUrl));
  const [tags, setTags] = useState<string[]>(place.tags ?? []);
  const [tagInput, setTagInput] = useState('');

  const addTag = (tag: string) => {
    const t = tag.trim().toLowerCase();
    if (!t || tags.includes(t)) return;
    setTags((prev) => [...prev, t]);
    setTagInput('');
  };

  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag));

  const handleSave = () => {
    onUpdate(place.id, {
      name,
      description,
      address,
      suggestedStartMinute: suggestedStartMinute === '' ? undefined : Number(suggestedStartMinute),
      suggestedDurationMinutes: suggestedDurationMinutes === '' ? undefined : Number(suggestedDurationMinutes),
      imageUrls,
      tags,
    });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="p-3 bg-ig-primary border border-ig-border rounded-md space-y-3">
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
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            type="number"
            min={0}
            max={1439}
            value={suggestedStartMinute}
            onChange={(e) => setSuggestedStartMinute(e.target.value)}
            placeholder="Suggested start minute"
            className="min-h-11 w-full rounded border border-ig-border bg-ig-secondary px-3 py-2 text-base text-ig-text-primary focus:border-ig-blue focus:outline-none md:text-sm"
          />
          <input
            type="number"
            min={1}
            value={suggestedDurationMinutes}
            onChange={(e) => setSuggestedDurationMinutes(e.target.value)}
            placeholder="Duration minutes"
            className="min-h-11 w-full rounded border border-ig-border bg-ig-secondary px-3 py-2 text-base text-ig-text-primary focus:border-ig-blue focus:outline-none md:text-sm"
          />
        </div>

        <div>
          <p className="text-xs text-ig-text-tertiary mb-2">Tags</p>
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
            <button
              type="button"
              onClick={() => addTag(tagInput)}
              className="min-h-11 rounded bg-ig-elevated border border-ig-border px-3 text-sm text-ig-text-secondary hover:border-ig-blue hover:text-ig-blue"
            >
              Add
            </button>
          </div>
        </div>

        <ImageUploadList
          token={token}
          usage="PLACE_IMAGE"
          label="Place images"
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

  const firstImage = place.images[0]?.imageUrl;

  return (
    <div className="group rounded-md border border-ig-border bg-ig-primary p-3">
      <div className="flex items-start gap-3">
        {firstImage && (
          <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-ig-border bg-ig-elevated">
            <img src={firstImage} alt="" className="h-full w-full object-cover" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm">📍</span>
                <p className="text-sm font-semibold text-ig-text-primary truncate">{place.name}</p>
              </div>
              {place.address && <p className="text-xs text-ig-text-tertiary mt-0.5 truncate">{place.address}</p>}
              {place.description && <p className="text-xs text-ig-text-secondary mt-1 line-clamp-2">{place.description}</p>}
              {(place.tags ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {(place.tags ?? []).map((tag) => (
                    <span key={tag} className="rounded-pill bg-ig-elevated border border-ig-border px-2 py-0.5 text-xs text-ig-text-secondary">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {(place.suggestedStartMinute !== null || place.suggestedDurationMinutes !== null) && (
                <p className="mt-1 text-xs text-ig-text-tertiary">
                  {place.suggestedStartMinute !== null ? `start +${place.suggestedStartMinute}m` : 'flex start'}
                  {place.suggestedDurationMinutes !== null ? ` · ${place.suggestedDurationMinutes} min` : ''}
                </p>
              )}
            </div>
            <div className="flex gap-1 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
              <button onClick={() => setEditing(true)} className="min-h-9 rounded-md px-2 text-xs text-ig-text-tertiary hover:text-ig-text-primary">Edit</button>
              <button onClick={() => onDelete(place.id)} className="min-h-9 rounded-md px-2 text-xs text-ig-text-tertiary hover:text-ig-error">Delete</button>
            </div>
          </div>
          {place.images.length > 1 && (
            <div className="flex gap-1 mt-2">
              {place.images.slice(1).map((img) => (
                <div key={img.id} className="w-8 h-8 rounded bg-ig-elevated overflow-hidden">
                  <img src={img.imageUrl} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
