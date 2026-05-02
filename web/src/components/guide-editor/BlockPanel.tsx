'use client';

import { useState } from 'react';
import type { GuideBlock, GuideBlockRequest, GuidePlaceRequest } from '@/types';
import PlaceCard from './PlaceCard';

interface Props {
  guideId: string;
  token: string;
  block: GuideBlock;
  onUpdateBlock: (blockId: string, data: GuideBlockRequest) => void;
  onDeleteBlock: (blockId: string) => void;
  onAddPlace: (blockId: string, data: GuidePlaceRequest) => void;
  onUpdatePlace: (placeId: string, data: GuidePlaceRequest) => void;
  onDeletePlace: (blockId: string, placeId: string) => void;
}

const BLOCK_CATEGORIES: { value: string; icon: string; label: string }[] = [
  { value: 'ACTIVITY', icon: '🗺️', label: 'Activity' },
  { value: 'SAFETY', icon: '🛡️', label: 'Safety' },
  { value: 'TRANSPORT', icon: '🚌', label: 'Transport' },
  { value: 'ACCOMMODATION', icon: '🏨', label: 'Accom.' },
  { value: 'SHOPPING', icon: '🛍️', label: 'Shopping' },
  { value: 'SEASONAL', icon: '📅', label: 'Seasonal' },
  { value: 'EMERGENCY', icon: '🚨', label: 'Emergency' },
  { value: 'SECRET', icon: '🔑', label: 'Secret' },
];

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

function minutesToDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export default function BlockPanel({ token, block, onUpdateBlock, onDeleteBlock, onAddPlace, onUpdatePlace, onDeletePlace }: Props) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(block.title || '');
  const [suggestedStartMinute, setSuggestedStartMinute] = useState(block.suggestedStartMinute?.toString() || '');
  const [suggestedDurationMinutes, setSuggestedDurationMinutes] = useState(block.suggestedDurationMinutes?.toString() || '');
  const [addingPlace, setAddingPlace] = useState(false);
  const [newPlaceName, setNewPlaceName] = useState('');

  const category = block.blockCategory || 'ACTIVITY';
  const isSecret = category === 'SECRET';
  const catMeta = BLOCK_CATEGORIES.find((c) => c.value === category);

  const handleSaveTitle = () => {
    onUpdateBlock(block.id, {
      title,
      blockType: block.blockType,
      blockCategory: block.blockCategory,
      suggestedStartMinute: suggestedStartMinute === '' ? undefined : Number(suggestedStartMinute),
      suggestedDurationMinutes: suggestedDurationMinutes === '' ? undefined : Number(suggestedDurationMinutes),
    });
    setEditingTitle(false);
  };

  const handleCategoryChange = (newCategory: string) => {
    onUpdateBlock(block.id, {
      title: block.title ?? undefined,
      blockType: block.blockType,
      blockCategory: newCategory,
      suggestedStartMinute: block.suggestedStartMinute ?? undefined,
    });
  };

  const handleAddPlace = () => {
    if (!newPlaceName.trim()) return;
    onAddPlace(block.id, { name: newPlaceName.trim() });
    setNewPlaceName('');
    setAddingPlace(false);
  };

  return (
    <div className={`border rounded-lg p-3 ${isSecret ? 'border-amber-500/40 bg-amber-500/5' : 'border-ig-border-light bg-ig-secondary/50'}`}>
      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {editingTitle ? (
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="min-h-11 min-w-0 flex-1 rounded border border-ig-border bg-ig-secondary px-3 py-2 text-base text-ig-text-primary focus:border-ig-blue focus:outline-none md:text-sm"
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTitle(); }}
              />
              <button onClick={handleSaveTitle} className="min-h-11 rounded-md px-3 text-sm font-semibold text-ig-blue">Save</button>
              <button onClick={() => setEditingTitle(false)} className="min-h-11 rounded-md px-3 text-sm text-ig-text-tertiary">Cancel</button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-ig-text-tertiary">Start (min)</label>
                <input
                  type="number"
                  min={0}
                  max={1439}
                  value={suggestedStartMinute}
                  onChange={(e) => setSuggestedStartMinute(e.target.value)}
                  className="min-h-11 w-24 rounded border border-ig-border bg-ig-secondary px-3 py-2 text-sm text-ig-text-primary focus:border-ig-blue focus:outline-none lg:min-h-0 lg:w-20 lg:py-1 lg:text-xs"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-ig-text-tertiary">Duration (min)</label>
                <input
                  type="number"
                  min={1}
                  value={suggestedDurationMinutes}
                  onChange={(e) => setSuggestedDurationMinutes(e.target.value)}
                  className="min-h-11 w-24 rounded border border-ig-border bg-ig-secondary px-3 py-2 text-sm text-ig-text-primary focus:border-ig-blue focus:outline-none lg:min-h-0 lg:w-20 lg:py-1 lg:text-xs"
                />
              </div>
            </div>
            <div>
              <p className="text-xs text-ig-text-tertiary mb-1.5">Block category</p>
              <div className="flex flex-wrap gap-1.5">
                {BLOCK_CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => handleCategoryChange(cat.value)}
                    className={`flex min-h-11 items-center gap-1 rounded-lg border px-3 py-2 text-sm transition-colors lg:min-h-0 lg:px-2 lg:py-1 lg:text-xs ${
                      category === cat.value
                        ? 'border-brand-500 bg-brand-500/15 text-brand-400'
                        : 'border-ig-border text-ig-text-secondary hover:border-brand-500/40'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            {isSecret ? (
              <span className="text-xs px-2 py-0.5 bg-amber-500/20 border border-amber-500/40 rounded-pill text-amber-400">
                🔑 Secret
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 bg-ig-elevated border border-ig-border rounded-pill text-ig-text-secondary">
                {catMeta?.icon} {catMeta?.label ?? block.blockType}
              </span>
            )}
            <h4 className="text-sm font-semibold text-ig-text-primary cursor-pointer hover:text-ig-blue" onClick={() => setEditingTitle(true)}>
              {block.title || 'Untitled Block'}
            </h4>
            {block.suggestedStartMinute !== null && block.suggestedStartMinute !== undefined && (
              <span className="text-xs text-ig-text-tertiary">
                ⏰ {minutesToTime(block.suggestedStartMinute)}
                {block.suggestedDurationMinutes ? ` ⏱ ${minutesToDuration(block.suggestedDurationMinutes)}` : ''}
              </span>
            )}
          </div>
        )}
        <button onClick={() => onDeleteBlock(block.id)} className="min-h-11 rounded-md px-3 text-sm text-ig-text-tertiary hover:text-ig-error sm:ml-2 lg:min-h-9 lg:px-2 lg:text-xs">Delete</button>
      </div>

      <div className="space-y-2">
        {block.places.map((place) => (
          <PlaceCard
            key={place.id}
            token={token}
            place={place}
            onUpdate={onUpdatePlace}
            onDelete={(placeId) => onDeletePlace(block.id, placeId)}
          />
        ))}
      </div>

      {addingPlace ? (
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            type="text"
            value={newPlaceName}
            onChange={(e) => setNewPlaceName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddPlace(); }}
            placeholder="Place name"
            className="min-h-11 min-w-0 flex-1 rounded border border-ig-border bg-ig-secondary px-3 py-2 text-base text-ig-text-primary focus:border-ig-blue focus:outline-none md:text-sm"
            autoFocus
          />
          <button onClick={handleAddPlace} className="min-h-11 rounded bg-ig-blue px-4 py-2 text-sm font-semibold text-white">Add</button>
          <button onClick={() => setAddingPlace(false)} className="min-h-11 rounded px-4 py-2 text-sm text-ig-text-secondary">Cancel</button>
        </div>
      ) : (
        <button
          onClick={() => setAddingPlace(true)}
          className="mt-2 min-h-11 rounded-md px-2 text-sm font-semibold text-ig-blue hover:text-ig-blue-hover"
        >
          + Add Place
        </button>
      )}
    </div>
  );
}
