'use client';

import { useState } from 'react';
import type { GuideBlock, GuideBlockRequest, GuidePlaceRequest } from '@/types';
import PlaceCard from './PlaceCard';

interface Props {
  guideId: string;
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

export default function BlockPanel({ block, onUpdateBlock, onDeleteBlock, onAddPlace, onUpdatePlace, onDeletePlace }: Props) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(block.title || '');
  const [suggestedStartMinute, setSuggestedStartMinute] = useState(block.suggestedStartMinute?.toString() || '');
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
      <div className="flex items-center justify-between mb-2">
        {editingTitle ? (
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="flex-1 px-2 py-1 bg-ig-secondary border border-ig-border rounded text-sm text-ig-text-primary focus:outline-none focus:border-ig-blue"
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTitle(); }}
              />
              <button onClick={handleSaveTitle} className="text-ig-blue text-sm font-semibold">Save</button>
              <button onClick={() => setEditingTitle(false)} className="text-ig-text-tertiary text-sm">Cancel</button>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-ig-text-tertiary">Suggested start minute</label>
              <input
                type="number"
                min={0}
                max={1439}
                value={suggestedStartMinute}
                onChange={(e) => setSuggestedStartMinute(e.target.value)}
                className="w-28 px-2 py-1 bg-ig-secondary border border-ig-border rounded text-xs text-ig-text-primary focus:outline-none focus:border-ig-blue"
              />
            </div>
            <div>
              <p className="text-xs text-ig-text-tertiary mb-1.5">Block category</p>
              <div className="flex flex-wrap gap-1.5">
                {BLOCK_CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => handleCategoryChange(cat.value)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs transition-colors ${
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
          <div className="flex items-center gap-2 flex-1">
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
              <span className="text-xs text-ig-text-tertiary">start +{block.suggestedStartMinute}m</span>
            )}
          </div>
        )}
        <button onClick={() => onDeleteBlock(block.id)} className="text-ig-text-tertiary hover:text-ig-error text-xs ml-2">Delete</button>
      </div>

      <div className="space-y-2">
        {block.places.map((place) => (
          <PlaceCard
            key={place.id}
            place={place}
            onUpdate={onUpdatePlace}
            onDelete={(placeId) => onDeletePlace(block.id, placeId)}
          />
        ))}
      </div>

      {addingPlace ? (
        <div className="flex gap-2 mt-2">
          <input
            type="text"
            value={newPlaceName}
            onChange={(e) => setNewPlaceName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddPlace(); }}
            placeholder="Place name"
            className="flex-1 px-2 py-1 bg-ig-secondary border border-ig-border rounded text-sm text-ig-text-primary focus:outline-none focus:border-ig-blue"
            autoFocus
          />
          <button onClick={handleAddPlace} className="px-3 py-1 bg-ig-blue text-white rounded text-sm font-semibold">Add</button>
          <button onClick={() => setAddingPlace(false)} className="px-3 py-1 text-ig-text-secondary text-sm">Cancel</button>
        </div>
      ) : (
        <button
          onClick={() => setAddingPlace(true)}
          className="mt-2 text-sm text-ig-blue hover:text-ig-blue-hover font-semibold"
        >
          + Add Place
        </button>
      )}
    </div>
  );
}
