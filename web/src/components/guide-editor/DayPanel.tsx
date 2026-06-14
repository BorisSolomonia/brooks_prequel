'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GuideDay } from '@/types';
import { BLOCK_CATEGORIES } from '@/lib/guideEditorConstants';
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

  return (
    <div className="border border-ig-border rounded-lg overflow-hidden">
      <div className="flex cursor-pointer flex-col gap-3 bg-ig-elevated px-4 py-3 sm:flex-row sm:items-center sm:justify-between" onClick={() => setCollapsed(!collapsed)}>
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <span className="text-xs text-ig-text-tertiary">{collapsed ? '▶' : '▼'}</span>
          <span className="text-sm font-semibold text-ig-blue">{t('guideEditor.dayPanel.dayNumber', { number: day.dayNumber })}</span>
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
              <button onClick={handleSaveTitle} className="min-h-11 rounded-md px-3 text-sm font-semibold text-ig-blue">{t('guideEditor.dayPanel.saveBtn')}</button>
            </div>
          ) : (
            <span
              className="text-sm text-ig-text-primary hover:text-ig-blue"
              onClick={(e) => { e.stopPropagation(); setEditingTitle(true); }}
            >
              {day.title || t('guideEditor.dayPanel.clickToAddTitle')}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <span className="text-xs text-ig-text-tertiary">{t('guideEditor.dayPanel.blockCount', { count: day.blocks.length })}</span>
          <button onClick={() => deleteDay(day.id)} className="min-h-11 rounded-md px-3 text-sm text-ig-text-tertiary hover:text-ig-error lg:min-h-9 lg:px-2 lg:text-xs">{t('guideEditor.dayPanel.deleteBtn')}</button>
        </div>
      </div>

      {!collapsed && (
        <div className="p-4 space-y-3">
          {day.blocks.map((block) => (
            <BlockPanel key={block.id} dayId={day.id} block={block} />
          ))}

          {addingBlock ? (
            <div className="border border-ig-border rounded-lg p-3 bg-ig-secondary/30">
              <p className="text-xs text-ig-text-tertiary mb-2">{t('guideEditor.dayPanel.chooseBlockType')}</p>
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
                          : 'border-brand-500 bg-brand-500/15 text-brand-500'
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
                  className="mw-button-primary min-h-11 rounded-lg px-4 py-2 text-sm"
                >
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
              className="min-h-11 w-full rounded-lg border border-dashed border-ig-border py-2 text-sm font-bold text-ig-blue transition-colors hover:border-ig-blue hover:bg-ig-secondary/50"
            >
              + {t('guideEditor.dayPanel.addBlockInlineBtn')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
