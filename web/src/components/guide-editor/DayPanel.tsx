'use client';

import { useState } from 'react';
import type { GuideDay, GuideDayRequest, GuideBlockRequest, GuidePlaceRequest } from '@/types';
import BlockPanel from './BlockPanel';

const BLOCK_CATEGORIES = [
  { value: 'ACTIVITY', label: 'Activity', icon: '🎯' },
  { value: 'SAFETY', label: 'Safety', icon: '🛡️' },
  { value: 'TRANSPORT', label: 'Transport', icon: '🚌' },
  { value: 'ACCOMMODATION', label: 'Stay', icon: '🏨' },
  { value: 'SHOPPING', label: 'Shopping', icon: '🛍️' },
  { value: 'SEASONAL', label: 'Seasonal', icon: '📅' },
  { value: 'EMERGENCY', label: 'Emergency', icon: '🚨' },
  { value: 'SECRET', label: 'Secret', icon: '🔑' },
];

interface Props {
  guideId: string;
  token: string;
  day: GuideDay;
  onUpdateDay: (dayId: string, data: GuideDayRequest) => void;
  onDeleteDay: (dayId: string) => void;
  onAddBlock: (dayId: string, data: GuideBlockRequest) => void;
  onUpdateBlock: (blockId: string, data: GuideBlockRequest) => void;
  onDeleteBlock: (dayId: string, blockId: string) => void;
  onAddPlace: (blockId: string, data: GuidePlaceRequest) => void;
  onUpdatePlace: (placeId: string, data: GuidePlaceRequest) => void;
  onDeletePlace: (blockId: string, placeId: string) => void;
}

export default function DayPanel({
  guideId, token, day, onUpdateDay, onDeleteDay,
  onAddBlock, onUpdateBlock, onDeleteBlock,
  onAddPlace, onUpdatePlace, onDeletePlace,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(day.title || '');
  const [addingBlock, setAddingBlock] = useState(false);
  const [newBlockCategory, setNewBlockCategory] = useState('ACTIVITY');

  const handleSaveTitle = () => {
    onUpdateDay(day.id, { title });
    setEditingTitle(false);
  };

  const handleAddBlock = () => {
    onAddBlock(day.id, { blockType: 'ACTIVITY', blockCategory: newBlockCategory });
    setAddingBlock(false);
    setNewBlockCategory('ACTIVITY');
  };

  return (
    <div className="border border-ig-border rounded-lg overflow-hidden">
      <div className="flex cursor-pointer flex-col gap-3 bg-ig-elevated px-4 py-3 sm:flex-row sm:items-center sm:justify-between" onClick={() => setCollapsed(!collapsed)}>
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <span className="text-xs text-ig-text-tertiary">{collapsed ? '▶' : '▼'}</span>
          <span className="text-sm font-semibold text-ig-blue">Day {day.dayNumber}</span>
          {editingTitle ? (
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="min-h-11 min-w-0 flex-1 rounded border border-ig-border bg-ig-secondary px-3 py-2 text-base text-ig-text-primary focus:border-ig-blue focus:outline-none md:text-sm"
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTitle(); }}
                autoFocus
              />
              <button onClick={handleSaveTitle} className="min-h-11 rounded-md px-3 text-sm font-semibold text-ig-blue">Save</button>
            </div>
          ) : (
            <span
              className="text-sm text-ig-text-primary hover:text-ig-blue"
              onClick={(e) => { e.stopPropagation(); setEditingTitle(true); }}
            >
              {day.title || 'Click to add title'}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <span className="text-xs text-ig-text-tertiary">{day.blocks.length} blocks</span>
          <button onClick={() => onDeleteDay(day.id)} className="min-h-11 rounded-md px-3 text-sm text-ig-text-tertiary hover:text-ig-error lg:min-h-9 lg:px-2 lg:text-xs">Delete</button>
        </div>
      </div>

      {!collapsed && (
        <div className="p-4 space-y-3">
          {day.blocks.map((block) => (
            <BlockPanel
              key={block.id}
              guideId={guideId}
              token={token}
              block={block}
              onUpdateBlock={onUpdateBlock}
              onDeleteBlock={(blockId) => onDeleteBlock(day.id, blockId)}
              onAddPlace={onAddPlace}
              onUpdatePlace={onUpdatePlace}
              onDeletePlace={onDeletePlace}
            />
          ))}

          {addingBlock ? (
            <div className="border border-ig-border rounded-lg p-3 bg-ig-secondary/30">
              <p className="text-xs text-ig-text-tertiary mb-2">Choose block type:</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {BLOCK_CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setNewBlockCategory(cat.value)}
                    className={`flex min-h-11 items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors lg:min-h-0 lg:px-2.5 lg:py-1.5 lg:text-xs ${
                      newBlockCategory === cat.value
                        ? cat.value === 'SECRET'
                          ? 'border-amber-500 bg-amber-500/15 text-amber-400'
                          : 'border-ig-blue bg-ig-blue/10 text-ig-blue'
                        : 'border-ig-border bg-ig-elevated text-ig-text-secondary hover:border-ig-blue/40'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleAddBlock}
                  className="min-h-11 rounded-lg bg-ig-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ig-blue-hover"
                >
                  Add Block
                </button>
                <button
                  onClick={() => { setAddingBlock(false); setNewBlockCategory('ACTIVITY'); }}
                  className="min-h-11 rounded-lg border border-ig-border px-4 py-2 text-sm text-ig-text-secondary transition-colors hover:border-ig-blue/40"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingBlock(true)}
              className="min-h-11 w-full rounded-lg border border-dashed border-ig-border py-2 text-sm text-ig-blue transition-colors hover:border-ig-blue hover:bg-ig-secondary/50"
            >
              + Add Block
            </button>
          )}
        </div>
      )}
    </div>
  );
}
