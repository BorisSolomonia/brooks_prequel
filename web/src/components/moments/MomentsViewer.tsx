'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { MomentView } from '@/lib/moments';

const SEGMENT_MS = 5000;

interface MomentsViewerProps {
  moments: MomentView[];
  startIndex?: number;
  onClose: () => void;
  /** Fired once each time a moment becomes the active one — feeds the view/engagement ledger. */
  onView?: (id: string) => void;
  onReact?: (id: string) => void;
}

/**
 * Full-screen, tap-through story viewer for Location Moments. Segment progress bars auto-advance;
 * tapping the left/right half steps between moments. Mirrors the app's existing StoryStrip viewer
 * pattern (fixed inset-0 z-50) but is decoupled from guide-promo fields.
 */
export default function MomentsViewer({ moments, startIndex = 0, onClose, onView, onReact }: MomentsViewerProps) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(Math.min(Math.max(startIndex, 0), Math.max(moments.length - 1, 0)));
  const [progress, setProgress] = useState(0);
  const startRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  const current = moments[index];

  const go = useCallback(
    (next: number) => {
      if (next < 0) return;
      if (next >= moments.length) {
        onClose();
        return;
      }
      setIndex(next);
    },
    [moments.length, onClose],
  );

  // Fire the view signal whenever the active moment changes.
  useEffect(() => {
    if (current && onView) onView(current.id);
  }, [current, onView]);

  // Auto-advance timer with a smooth progress bar.
  useEffect(() => {
    setProgress(0);
    startRef.current = 0;
    const tick = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const pct = Math.min(1, elapsed / SEGMENT_MS);
      setProgress(pct);
      if (pct >= 1) {
        go(index + 1);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [index, go]);

  // Escape to close (web).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(index + 1);
      if (e.key === 'ArrowLeft') go(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, go, onClose]);

  if (!current) return null;

  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-black">
      {/* Segment progress bars */}
      <div className="flex gap-1 px-3 pt-3">
        {moments.map((m, i) => (
          <div key={m.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
            <div
              className="h-full bg-white"
              style={{ width: i < index ? '100%' : i === index ? `${progress * 100}%` : '0%' }}
            />
          </div>
        ))}
      </div>

      {/* Header — identified to the audience (avatar + name), plus coarse freshness */}
      <div className="flex items-center justify-between px-4 py-2 text-white">
        <div className="flex items-center gap-2">
          {current.authorAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current.authorAvatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
          ) : (
            <div className="h-7 w-7 rounded-full bg-white/25" />
          )}
          <div className="leading-tight">
            {current.authorName && <p className="text-sm font-bold text-white">{current.authorName}</p>}
            <p className="text-xs text-white/70">
              {current.placeName ? `📍 ${current.placeName} · ` : ''}
              {t(`moments.fresh.${current.freshness}`)}
            </p>
          </div>
        </div>
        <button aria-label={t('moments.close')} onClick={onClose} className="text-2xl leading-none text-white/90">
          &times;
        </button>
      </div>

      {/* Media + tap zones */}
      <div className="relative flex-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current.mediaRef} alt="" className="absolute inset-0 h-full w-full object-contain" />
        <button
          aria-label={t('moments.previous')}
          className="absolute inset-y-0 left-0 w-1/3"
          onClick={() => go(index - 1)}
        />
        <button
          aria-label={t('moments.next')}
          className="absolute inset-y-0 right-0 w-1/3"
          onClick={() => go(index + 1)}
        />
        {current.caption && (
          <div className="absolute inset-x-0 bottom-16 px-6">
            <p className="rounded-lg bg-black/40 px-3 py-2 text-center text-sm text-white">{current.caption}</p>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-center gap-6 px-4 py-4 pb-[calc(1rem_+_env(safe-area-inset-bottom))]">
        {onReact && (
          <button
            onClick={() => onReact(current.id)}
            className="rounded-full border-2 border-white/70 px-5 py-2 text-sm font-bold text-white"
          >
            {t('moments.react')}
          </button>
        )}
      </div>
    </div>
  );
}
