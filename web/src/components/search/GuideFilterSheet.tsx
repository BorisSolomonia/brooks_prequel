'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SearchFilterBar, { type SortOption } from '@/components/search/SearchFilterBar';

// Mobile-first filter bottom sheet for the Guides page (BOR-26). Houses the
// granular filters (Rating, Sort By, Min/Max Price) that used to sit inline and
// eat the viewport. Mirrors the ConfirmDialog idiom — bottom sheet on mobile,
// centered modal on md+, backdrop/ESC dismiss, drag handle, `mw-sheet-in` entry —
// and adds swipe-down-to-dismiss. The granular controls are the SHARED
// SearchFilterBar (unchanged, so the Creators page is unaffected), driven here by
// DRAFT state: edits don't touch the query until "Apply"; "Clear all" resets the
// draft. Backdrop / ESC / swipe close without committing.

export interface ChipOption {
  value: string;
  label: string;
}

export interface GuideFilterValues {
  stage: string;
  personas: string[];
  minRating: number | null;
  sort: string;
  priceMin: string;
  priceMax: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  committed: GuideFilterValues;
  // Category options relocated into the sheet (BOR-28): stage is single-select
  // (incl. an "Any" entry with value ''), personas are multi-select.
  stages: ChipOption[];
  personas: ChipOption[];
  sortOptions: SortOption[];
  defaultSort?: string;
  onApply: (next: GuideFilterValues) => void;
}

// Downward drag (px) past which a release dismisses the sheet.
const SWIPE_DISMISS_PX = 90;

export function countActiveFilters(v: GuideFilterValues, defaultSort = 'RELEVANCE'): number {
  let n = 0;
  if (v.stage) n += 1;
  n += v.personas.length;
  if (v.minRating != null) n += 1;
  if (v.sort && v.sort !== defaultSort) n += 1;
  if (v.priceMin.trim()) n += 1;
  if (v.priceMax.trim()) n += 1;
  return n;
}

export default function GuideFilterSheet({
  open,
  onClose,
  committed,
  stages,
  personas,
  sortOptions,
  defaultSort = 'RELEVANCE',
  onApply,
}: Props) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<GuideFilterValues>(committed);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const touchStartY = useRef<number | null>(null);

  // Seed the draft from the committed filters each time the sheet OPENS, so it
  // always reflects the live query when reopened (and discards any unapplied edits).
  useEffect(() => {
    if (open) {
      setDraft(committed);
      setDragY(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Lock background scroll + ESC-to-dismiss while open.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    setDragging(true);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current == null) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    setDragY(Math.max(0, dy)); // only track downward drag
  };
  const handleTouchEnd = () => {
    setDragging(false);
    if (dragY > SWIPE_DISMISS_PX) onClose();
    setDragY(0);
    touchStartY.current = null;
  };

  const clearAll = () =>
    setDraft({ stage: '', personas: [], minRating: null, sort: defaultSort, priceMin: '', priceMax: '' });

  const togglePersona = (value: string) =>
    setDraft((d) => ({
      ...d,
      personas: d.personas.includes(value)
        ? d.personas.filter((p) => p !== value)
        : [...d.personas, value],
    }));

  const apply = () => {
    onApply(draft);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('discovery.search.filtersAriaLabel')}
      className="fixed inset-0 z-[110] flex items-end justify-center md:items-center"
    >
      {/* Backdrop — tap to dismiss (no commit). */}
      <button
        type="button"
        aria-label={t('discovery.search.filtersDismissAriaLabel')}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative flex max-h-[85dvh] w-full max-w-md flex-col rounded-t-3xl border-2 border-ig-border bg-ig-elevated shadow-[0_-12px_32px_rgba(15,23,42,0.18)] md:max-h-[80vh] md:rounded-3xl"
        style={{
          transform: `translateY(${dragY}px)`,
          transition: dragging ? 'none' : 'transform 200ms ease-out',
          animation: 'mw-sheet-in 220ms ease-out',
        }}
      >
        {/* Draggable header: drag handle (swipe down to dismiss) + title + close. */}
        <div
          className="shrink-0 touch-none px-5 pt-3"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-ig-border" />
          <div className="mb-1 flex items-center justify-between">
            <h2 className="font-display text-base font-black uppercase tracking-[0.08em] text-ig-text-primary">
              {t('discovery.search.filtersTitle')}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('discovery.search.filtersCloseAriaLabel')}
              className="flex h-9 w-9 items-center justify-center rounded-full text-ig-text-tertiary transition hover:bg-ig-hover hover:text-ig-text-primary"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable filter body. Category chips (stage + persona) relocated here
            from the main viewport (BOR-28), above the shared rating/sort/price bar. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5">
          <div className="mb-3 rounded-xl border border-ig-border bg-ig-elevated/60 p-3">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ig-text-tertiary">{t('discovery.search.filterStageLabel')}</span>
            <div className="flex flex-wrap gap-2">
              {stages.map((s) => {
                const active = draft.stage === s.value;
                return (
                  <button
                    key={`stage-${s.value || 'any'}`}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setDraft((d) => ({ ...d, stage: s.value }))}
                    className={`min-h-11 rounded-full border px-4 py-2 text-sm font-semibold transition-colors lg:min-h-0 lg:px-3 lg:py-1 lg:text-xs ${
                      active
                        ? 'border-brand-500 bg-brand-500/15 text-brand-400'
                        : 'border-ig-border text-ig-text-secondary hover:border-brand-500/40'
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
            <span className="mb-1.5 mt-3 block text-xs font-semibold uppercase tracking-wide text-ig-text-tertiary">{t('discovery.search.filterTravelerTypeLabel')}</span>
            <div className="flex flex-wrap gap-2">
              {personas.map((p) => {
                const active = draft.personas.includes(p.value);
                return (
                  <button
                    key={`persona-${p.value}`}
                    type="button"
                    aria-pressed={active}
                    onClick={() => togglePersona(p.value)}
                    className={`min-h-11 rounded-full border px-4 py-2 text-sm font-semibold transition-colors lg:min-h-0 lg:px-3 lg:py-1 lg:text-xs ${
                      active
                        ? 'border-brand-500 bg-brand-500/15 text-brand-400'
                        : 'border-ig-border text-ig-text-secondary hover:border-brand-500/40'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
          <SearchFilterBar
            minRating={draft.minRating}
            onMinRating={(v) => setDraft((d) => ({ ...d, minRating: v }))}
            sort={draft.sort}
            onSort={(v) => setDraft((d) => ({ ...d, sort: v }))}
            sortOptions={sortOptions}
            showPrice
            priceMin={draft.priceMin}
            priceMax={draft.priceMax}
            onPriceMin={(v) => setDraft((d) => ({ ...d, priceMin: v }))}
            onPriceMax={(v) => setDraft((d) => ({ ...d, priceMax: v }))}
          />
        </div>

        {/* Footer actions. */}
        <div
          className="flex shrink-0 gap-3 border-t-2 border-ig-border px-5 py-3"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            onClick={clearAll}
            className="mw-button-secondary inline-flex min-h-touch flex-1 items-center justify-center rounded-2xl px-4 text-sm font-semibold text-ig-text-primary"
          >
            {t('discovery.search.filterClearAll')}
          </button>
          <button
            type="button"
            onClick={apply}
            className="inline-flex min-h-touch flex-1 items-center justify-center rounded-2xl bg-brand-500 px-4 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            {t('discovery.search.filterApply')}
          </button>
        </div>

        <style jsx global>{`
          @keyframes mw-sheet-in {
            from {
              transform: translateY(40px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
