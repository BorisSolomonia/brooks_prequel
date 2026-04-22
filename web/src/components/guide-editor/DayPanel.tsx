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
  guideId, day, onUpdateDay, onDeleteDay,
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
      <div className="flex items-center justify-between px-4 py-3 bg-ig-elevated cursor-pointer" onClick={() => setCollapsed(!collapsed)}>
        <div className="flex items-center gap-3">
          <span className="text-xs text-ig-text-tertiary">{collapsed ? '▶' : '▼'}</span>
          <span className="text-sm font-semibold text-ig-blue">Day {day.dayNumber}</span>
          {editingTitle ? (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="px-2 py-1 bg-ig-secondary border border-ig-border rounded text-sm text-ig-text-primary focus:outline-none focus:border-ig-blue"
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTitle(); }}
                autoFocus
              />
              <button onClick={handleSaveTitle} className="text-ig-blue text-sm font-semibold">Save</button>
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
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <span className="text-xs text-ig-text-tertiary">{day.blocks.length} blocks</span>
          <button onClick={() => onDeleteDay(day.id)} className="text-ig-text-tertiary hover:text-ig-error text-xs">Delete</button>
        </div>
      </div>

      {!collapsed && (
        <div className="p-4 space-y-3">
          {day.blocks.map((block) => (
            <BlockPanel
              key={block.id}
              guideId={guideId}
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
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
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
              <div className="flex gap-2">
                <button
                  onClick={handleAddBlock}
                  className="px-4 py-1.5 bg-ig-blue text-white rounded-lg text-sm font-semibold hover:bg-ig-blue-hover transition-colors"
                >
                  Add Block
                </button>
                <button
                  onClick={() => { setAddingBlock(false); setNewBlockCategory('ACTIVITY'); }}
                  className="px-4 py-1.5 border border-ig-border rounded-lg text-sm text-ig-text-secondary hover:border-ig-blue/40 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingBlock(true)}
              className="w-full py-2 border border-dashed border-ig-border rounded-lg text-sm text-ig-blue hover:border-ig-blue hover:bg-ig-secondary/50 transition-colors"
            >
              + Add Block
            </button>
          )}
        </div>
      )}
    </div>
  );
}
