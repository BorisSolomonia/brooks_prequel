'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GuideBlock } from '@/types';
import { BLOCK_CATEGORIES, findBlockCategory, blockCategoryColor } from '@/lib/guideEditorConstants';
import { BLOCK_DOT, BLOCK_DOT_LEFT, maskRing } from '@/lib/guideTimeline';
import { BlockCategoryIcon, AlertIcon, PlusIcon, TrashIcon, ClockIcon } from './TimelineIcons';
import PlaceCard from './PlaceCard';
import { useGuideEdit } from './GuideEditContext';

interface Props {
  dayId: string;
  block: GuideBlock;
}

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

export default function BlockPanel({ dayId, block }: Props) {
  const { t } = useTranslation();
  const { updateBlock, deleteBlock, addPlace } = useGuideEdit();
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(block.title || '');
  const [suggestedStartMinute, setSuggestedStartMinute] = useState(block.suggestedStartMinute?.toString() || '');
  const [suggestedDurationMinutes, setSuggestedDurationMinutes] = useState(block.suggestedDurationMinutes?.toString() || '');
  const [addingPlace, setAddingPlace] = useState(false);
  const [newPlaceName, setNewPlaceName] = useState('');

  const category = block.blockCategory || 'ACTIVITY';
  const catMeta = findBlockCategory(category);
  const color = blockCategoryColor(category); // e.g. rgb(var(--brand-500))
  const isEmpty = block.places.length === 0;

  const handleSaveTitle = () => {
    updateBlock(block.id, {
      title,
      blockType: block.blockType,
      blockCategory: block.blockCategory,
      suggestedStartMinute: suggestedStartMinute === '' ? undefined : Number(suggestedStartMinute),
      suggestedDurationMinutes: suggestedDurationMinutes === '' ? undefined : Number(suggestedDurationMinutes),
    });
    setEditingTitle(false);
  };

  const handleCategoryChange = (newCategory: string) => {
    updateBlock(block.id, {
      title: block.title ?? undefined,
      blockType: block.blockType,
      blockCategory: newCategory,
      suggestedStartMinute: block.suggestedStartMinute ?? undefined,
    });
  };

  const handleAddPlace = () => {
    if (!newPlaceName.trim()) return;
    addPlace(block.id, { name: newPlaceName.trim() });
    setNewPlaceName('');
    setAddingPlace(false);
  };

  return (
    // position:relative so the spine dot can be pushed back onto the spine; the
    // dot sits at a negative left so overflow MUST stay visible (no clip).
    <div className="relative">
      {/* Block dot ON the spine. Filled when the block has places, hollow (just a
          ring) when empty so an incomplete block reads at a glance. The box-shadow
          masks the spine line behind it against the base background. */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: BLOCK_DOT_LEFT,
          top: 18,
          width: BLOCK_DOT,
          height: BLOCK_DOT,
          borderRadius: '9999px',
          background: isEmpty ? 'var(--bg-primary)' : color,
          border: isEmpty ? `2px solid ${color}` : 'none',
          boxShadow: maskRing(),
        }}
      />

      <div className="rounded-xl border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
        <div className="p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
                  <button onClick={handleSaveTitle} className="min-h-11 rounded-md px-3 text-sm font-semibold text-ig-blue">{t('guideEditor.blockPanel.saveBtn')}</button>
                  <button onClick={() => setEditingTitle(false)} className="min-h-11 rounded-md px-3 text-sm text-ig-text-tertiary">{t('guideEditor.blockPanel.cancelBtn')}</button>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-ig-text-tertiary">{t('guideEditor.blockPanel.startMin')}</label>
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
                    <label className="text-xs text-ig-text-tertiary">{t('guideEditor.blockPanel.durationMin')}</label>
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
                  <p className="text-xs text-ig-text-tertiary mb-1.5">{t('guideEditor.blockPanel.blockCategory')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {BLOCK_CATEGORIES.map((cat) => {
                      const active = category === cat.value;
                      return (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => handleCategoryChange(cat.value)}
                          className="flex min-h-11 items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors lg:min-h-0 lg:px-2 lg:py-1 lg:text-xs"
                          style={{
                            color: active ? cat.colorVar : 'var(--text-secondary)',
                            borderColor: active
                              ? `color-mix(in srgb, ${cat.colorVar} 55%, var(--border))`
                              : 'var(--border)',
                            background: active
                              ? `color-mix(in srgb, ${cat.colorVar} 14%, var(--bg-elevated))`
                              : 'transparent',
                          }}
                        >
                          <BlockCategoryIcon category={cat.value} className="h-4 w-4" />
                          <span>{cat.shortLabel ?? cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                {/* Colour-coded category chip (dot/chip/bullets share the token). */}
                <span
                  className="inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-xs font-semibold"
                  style={{
                    color,
                    background: `color-mix(in srgb, ${color} 14%, var(--bg-elevated))`,
                    border: `1px solid color-mix(in srgb, ${color} 40%, var(--border))`,
                  }}
                >
                  <BlockCategoryIcon category={category} className="h-3.5 w-3.5" />
                  <span>{catMeta?.shortLabel ?? catMeta?.label ?? block.blockType}</span>
                </span>
                <h4 className="text-sm font-semibold text-ig-text-primary cursor-pointer hover:text-ig-blue" onClick={() => setEditingTitle(true)}>
                  {block.title || t('guideEditor.blockPanel.untitledBlock')}
                </h4>
                {block.suggestedStartMinute !== null && block.suggestedStartMinute !== undefined && (
                  <span className="inline-flex items-center gap-1 text-xs text-ig-text-tertiary">
                    <ClockIcon className="h-3.5 w-3.5" />
                    {minutesToTime(block.suggestedStartMinute)}
                    {block.suggestedDurationMinutes ? ` · ${minutesToDuration(block.suggestedDurationMinutes)}` : ''}
                  </span>
                )}
              </div>
            )}
            <button
              onClick={() => deleteBlock(dayId, block.id)}
              aria-label={t('guideEditor.blockPanel.deleteBtn')}
              title={t('guideEditor.blockPanel.deleteBtn')}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-ig-text-tertiary hover:text-ig-error sm:ml-2 lg:min-h-9 lg:min-w-9"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Places — normal document flow, each marked with a bullet in the
              block's colour token. Empty Block state shows an alert glyph. */}
          {isEmpty ? (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-dashed border-ig-border px-3 py-2 text-xs text-ig-text-tertiary">
              <AlertIcon className="h-4 w-4 shrink-0" style={{ color: 'rgb(var(--accent-500))' }} />
              <span>{t('guideEditor.blockPanel.noPlacesYet')}</span>
            </div>
          ) : (
            <div className="mt-2 space-y-2">
              {(() => {
                // Running end-time cursor so each place's Start Time pre-fills from
                // the previous place's end (block start for the first place).
                let cursor: number | null = block.suggestedStartMinute ?? null;
                return block.places.map((place) => {
                  const defaultStart = cursor;
                  const dur = place.suggestedDurationMinutes ?? 60;
                  const start = place.suggestedStartMinute ?? cursor;
                  cursor = start != null ? start + dur : cursor;
                  return (
                    <div key={place.id} className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="shrink-0 rounded-full"
                        style={{ width: 7, height: 7, background: color }}
                      />
                      <div className="min-w-0 flex-1">
                        <PlaceCard blockId={block.id} place={place} defaultStartMinute={defaultStart} />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}

          {addingPlace ? (
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                type="text"
                value={newPlaceName}
                onChange={(e) => setNewPlaceName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddPlace(); }}
                placeholder={t('guideEditor.blockPanel.placeNamePlaceholder')}
                className="min-h-11 min-w-0 flex-1 rounded border border-ig-border bg-ig-secondary px-3 py-2 text-base text-ig-text-primary focus:border-ig-blue focus:outline-none md:text-sm"
                autoFocus
              />
              <button onClick={handleAddPlace} className="mw-button-primary min-h-11 rounded px-4 py-2 text-sm">{t('guideEditor.blockPanel.addBtn')}</button>
              <button onClick={() => setAddingPlace(false)} className="min-h-11 rounded px-4 py-2 text-sm text-ig-text-secondary">{t('guideEditor.blockPanel.cancelBtn')}</button>
            </div>
          ) : (
            <button
              onClick={() => setAddingPlace(true)}
              className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-semibold text-ig-blue hover:text-ig-blue-hover"
            >
              <PlusIcon className="h-4 w-4" />
              {t('guideEditor.blockPanel.addPlaceBtn')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
