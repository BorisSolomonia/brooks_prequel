'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GuideDay } from '@/types';
import { BLOCK_CATEGORIES } from '@/lib/guideEditorConstants';
import { DAY_NODE, DAY_NODE_LEFT, NODE_TOP, PAD, maskRing } from '@/lib/guideTimeline';
import { ChevronIcon, PlusIcon, TrashIcon, AlertIcon, BlockCategoryIcon } from './TimelineIcons';
import BlockPanel from './BlockPanel';
import { useGuideEdit } from './GuideEditContext';

interface Props {
  day: GuideDay;
}

export default function DayPanel({ day }: Props) {
  const { t } = useTranslation();
  const { updateDay, deleteDay, addBlock } = useGuideEdit();
  const [collapsed, setCollapsed] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(day.title || '');
  const [addingBlock, setAddingBlock] = useState(false);
  const [newBlockCategory, setNewBlockCategory] = useState('ACTIVITY');

  const handleSaveTitle = () => {
    updateDay(day.id, { title });
    setEditingTitle(false);
  };

  const handleAddBlock = () => {
    addBlock(day.id, { blockType: 'ACTIVITY', blockCategory: newBlockCategory });
    setAddingBlock(false);
    setNewBlockCategory('ACTIVITY');
  };

  const isEmpty = day.blocks.length === 0;

  return (
    // position:relative anchors the Day node onto the shared spine that the
    // parent timeline draws. No card border here — the node + spine carry the
    // hierarchy, so the node masks the base background, never a card surface.
    <div className="relative">
      {/* Day node: numbered circle sitting on the spine. The box-shadow ring
          masks the line behind it so the spine looks gapped without any real
          gap (works in light/dark/dim because it reads --bg-primary). */}
      <div
        aria-hidden
        className="flex items-center justify-center font-display font-black"
        style={{
          position: 'absolute',
          left: DAY_NODE_LEFT,
          top: NODE_TOP,
          width: DAY_NODE,
          height: DAY_NODE,
          borderRadius: '9999px',
          background: 'rgb(var(--brand-500))',
          color: 'var(--bg-elevated)',
          fontSize: '0.8rem',
          boxShadow: maskRing(),
        }}
      >
        {day.dayNumber}
      </div>

      {/* Day header row — content lives in the column right of the spine. */}
      <div className="flex min-h-11 items-center gap-2" style={{ paddingLeft: PAD }}>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? t('guideEditor.dayPanel.expand') : t('guideEditor.dayPanel.collapse')}
          aria-expanded={!collapsed}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-ig-text-tertiary hover:text-ig-text-primary lg:min-h-9 lg:min-w-9"
        >
          <ChevronIcon open={!collapsed} className="h-4 w-4" />
        </button>

        {editingTitle ? (
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="min-h-11 min-w-0 flex-1 rounded border border-ig-border bg-ig-secondary px-3 py-2 text-base text-ig-text-primary focus:border-ig-blue focus:outline-none md:text-sm"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTitle(); }}
              placeholder={t('guideEditor.dayPanel.clickToAddTitle')}
              autoFocus
            />
            <button onClick={handleSaveTitle} className="min-h-11 rounded-md px-3 text-sm font-semibold text-ig-blue">{t('guideEditor.dayPanel.saveBtn')}</button>
          </div>
        ) : (
          <button
            type="button"
            className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-ig-text-primary hover:text-ig-blue"
            onClick={() => setEditingTitle(true)}
          >
            {day.title || (
              <span className="font-normal text-ig-text-tertiary">{t('guideEditor.dayPanel.clickToAddTitle')}</span>
            )}
          </button>
        )}

        <span className="shrink-0 text-xs text-ig-text-tertiary">{t('guideEditor.dayPanel.blockCount', { count: day.blocks.length })}</span>
        <button
          onClick={() => deleteDay(day.id)}
          aria-label={t('guideEditor.dayPanel.deleteBtn')}
          title={t('guideEditor.dayPanel.deleteBtn')}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-ig-text-tertiary hover:text-ig-error lg:min-h-9 lg:min-w-9"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Blocks. Conditional render on collapse so the negative-left block dots
          are never clipped; the spine + node stay intact when hidden. tl-reveal
          gives the expand a smooth fade so it doesn't pop in. */}
      {!collapsed && (
        <div className="tl-reveal space-y-3 pt-3" style={{ paddingLeft: PAD }}>
          {day.blocks.map((block) => (
            <BlockPanel key={block.id} dayId={day.id} block={block} />
          ))}

          {isEmpty && !addingBlock && (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-ig-border px-3 py-2 text-xs text-ig-text-tertiary">
              <AlertIcon className="h-4 w-4 shrink-0" style={{ color: 'rgb(var(--accent-500))' }} />
              <span>{t('guideEditor.dayPanel.noBlocksYet')}</span>
            </div>
          )}

          {addingBlock ? (
            <div className="rounded-xl border border-ig-border p-3" style={{ background: 'var(--bg-elevated)' }}>
              <p className="text-xs text-ig-text-tertiary mb-2">{t('guideEditor.dayPanel.chooseBlockType')}</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {BLOCK_CATEGORIES.map((cat) => {
                  const active = newBlockCategory === cat.value;
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setNewBlockCategory(cat.value)}
                      className="flex min-h-11 items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors lg:min-h-9 lg:px-2.5 lg:py-1.5 lg:text-xs"
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
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={handleAddBlock} className="mw-button-primary min-h-11 rounded-lg px-4 py-2 text-sm">
                  {t('guideEditor.dayPanel.addBlockBtn')}
                </button>
                <button
                  onClick={() => { setAddingBlock(false); setNewBlockCategory('ACTIVITY'); }}
                  className="min-h-11 rounded-lg border border-ig-border px-4 py-2 text-sm text-ig-text-secondary transition-colors hover:border-ig-blue/40"
                >
                  {t('guideEditor.dayPanel.cancelBtn')}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingBlock(true)}
              className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-ig-border py-2 text-sm font-semibold text-ig-blue transition-colors hover:border-ig-blue hover:bg-ig-secondary/40"
            >
              <PlusIcon className="h-4 w-4" />
              {t('guideEditor.dayPanel.addBlockInlineBtn')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
