'use client';

import { useState } from 'react';
import type { GuidePlace, GuidePlaceRequest } from '@/types';

interface Props {
  place: GuidePlace;
  onUpdate: (placeId: string, data: GuidePlaceRequest) => void;
  onDelete: (placeId: string) => void;
}

export default function PlaceCard({ place, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(place.name);
  const [description, setDescription] = useState(place.description || '');
  const [address, setAddress] = useState(place.address || '');
  const [suggestedStartMinute, setSuggestedStartMinute] = useState(place.suggestedStartMinute?.toString() || '');
  const [suggestedDurationMinutes, setSuggestedDurationMinutes] = useState(place.suggestedDurationMinutes?.toString() || '');

  const handleSave = () => {
    onUpdate(place.id, {
      name,
      description,
      address,
      suggestedStartMinute: suggestedStartMinute === '' ? undefined : Number(suggestedStartMinute),
      suggestedDurationMinutes: suggestedDurationMinutes === '' ? undefined : Number(suggestedDurationMinutes),
    });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="p-3 bg-ig-primary border border-ig-border rounded-md space-y-2">
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
        <div className="flex flex-wrap gap-2">
          <button onClick={handleSave} className="min-h-11 rounded bg-ig-blue px-4 py-2 text-sm font-semibold text-white">Save</button>
          <button onClick={() => setEditing(false)} className="min-h-11 rounded px-4 py-2 text-sm text-ig-text-secondary">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex flex-col gap-3 rounded-md border border-ig-border bg-ig-primary p-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm">📍</span>
          <p className="text-sm font-semibold text-ig-text-primary truncate">{place.name}</p>
        </div>
        {place.address && <p className="text-xs text-ig-text-tertiary mt-0.5 truncate">{place.address}</p>}
        {place.description && <p className="text-xs text-ig-text-secondary mt-1 line-clamp-2">{place.description}</p>}
        {(place.suggestedStartMinute !== null || place.suggestedDurationMinutes !== null) && (
          <p className="mt-1 text-xs text-ig-text-tertiary">
            {place.suggestedStartMinute !== null ? `start +${place.suggestedStartMinute}m` : 'flex start'}
            {place.suggestedDurationMinutes !== null ? ` · ${place.suggestedDurationMinutes} min` : ''}
          </p>
        )}
        {place.images.length > 0 && (
          <div className="flex gap-1 mt-2">
            {place.images.map((img) => (
              <div key={img.id} className="w-10 h-10 rounded bg-ig-elevated overflow-hidden">
                <img src={img.imageUrl} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-1 sm:ml-2 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
        <button onClick={() => setEditing(true)} className="min-h-9 rounded-md px-2 text-xs text-ig-text-tertiary hover:text-ig-text-primary">Edit</button>
        <button onClick={() => onDelete(place.id)} className="min-h-9 rounded-md px-2 text-xs text-ig-text-tertiary hover:text-ig-error">Delete</button>
      </div>
    </div>
  );
}
