'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { MyTripItem, GuidePlace } from '@/types';
import ParallaxBackground from './ParallaxBackground';
import PathwayNode from './PathwayNode';
import PathwayPlaceSheet from './PathwayPlaceSheet';

type Props = {
  items: MyTripItem[];
  placeLookup: Map<string, GuidePlace>;
  visitedMap: Record<string, boolean>;
  onToggleVisited: (item: MyTripItem) => void;
};

type Row =
  | { kind: 'day'; dayNumber: number; key: string }
  | { kind: 'card'; item: MyTripItem; index: number; key: string };

function formatTime(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function scheduledLabelFor(item: MyTripItem): string | null {
  const start = formatTime(item.scheduledStart);
  const end = formatTime(item.scheduledEnd);
  if (start && end) return `${start} – ${end}`;
  if (start) return start;
  return null;
}

export default function Pathway({ items, placeLookup, visitedMap, onToggleVisited }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const reducedMotionRef = useRef(false);
  const [activeItem, setActiveItem] = useState<MyTripItem | null>(null);

  const visibleItems = useMemo(
    () => items
      .filter((item) => !item.skipped)
      .sort((a, b) =>
        a.dayNumber !== b.dayNumber
          ? a.dayNumber - b.dayNumber
          : a.blockPosition !== b.blockPosition
          ? a.blockPosition - b.blockPosition
          : a.placePosition - b.placePosition,
      ),
    [items],
  );

  const rows = useMemo<Row[]>(() => {
    const list: Row[] = [];
    let lastDay = -1;
    visibleItems.forEach((item, index) => {
      if (item.dayNumber !== lastDay) {
        list.push({ kind: 'day', dayNumber: item.dayNumber, key: `day-${item.dayNumber}` });
        lastDay = item.dayNumber;
      }
      list.push({ kind: 'card', item, index, key: item.id });
    });
    return list;
  }, [visibleItems]);

  const totalCards = visibleItems.length;

  useEffect(() => {
    cardRefs.current = cardRefs.current.slice(0, totalCards);
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionRef.current = mql.matches;
    const onChange = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
    };
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [totalCards]);

  // Scroll-driven scale / opacity interpolation
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      const viewportCenter = vh / 2;
      const halfVh = vh / 2;
      const reduce = reducedMotionRef.current;
      cardRefs.current.forEach((el) => {
        if (!el) return;
        if (reduce) {
          el.style.transform = '';
          el.style.opacity = '';
          return;
        }
        const rect = el.getBoundingClientRect();
        const cardCenter = rect.top + rect.height / 2;
        const distance = Math.abs(cardCenter - viewportCenter);
        const t = Math.min(1, distance / halfVh);
        const scale = 1 - t * 0.15;
        const opacity = 1 - t * 0.5;
        el.style.transform = `scale(${scale.toFixed(3)})`;
        el.style.opacity = opacity.toFixed(3);
      });
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [rows]);

  // Gentle snap on scroll-end
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let stopTimer: ReturnType<typeof setTimeout> | null = null;
    let suppressUntil = 0;
    const onScrollEnd = () => {
      if (reducedMotionRef.current) return;
      if (Date.now() < suppressUntil) return;
      const container = containerRef.current;
      if (!container) return;
      const cRect = container.getBoundingClientRect();
      const vh = window.innerHeight;
      // Only snap when pathway occupies the viewport center
      if (cRect.top > vh * 0.4 || cRect.bottom < vh * 0.6) return;
      const viewportCenter = vh / 2;
      let nearest: HTMLDivElement | null = null;
      let nearestDist = Infinity;
      cardRefs.current.forEach((el) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const center = r.top + r.height / 2;
        const dist = Math.abs(center - viewportCenter);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = el;
        }
      });
      // Only snap if reasonably close (within 35% of viewport height)
      if (!nearest || nearestDist > vh * 0.35) return;
      // nearest may be HTMLDivElement | null per TS — assert via local const
      const target = nearest as HTMLDivElement;
      const rect = target.getBoundingClientRect();
      const delta = rect.top + rect.height / 2 - viewportCenter;
      if (Math.abs(delta) < 6) return;
      suppressUntil = Date.now() + 600;
      window.scrollBy({ top: delta, behavior: 'smooth' });
    };
    const onScroll = () => {
      if (stopTimer) clearTimeout(stopTimer);
      stopTimer = setTimeout(onScrollEnd, 180);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      if (stopTimer) clearTimeout(stopTimer);
      window.removeEventListener('scroll', onScroll);
    };
  }, [rows]);

  let cardCursor = 0;

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-2xl border-2 border-ig-border bg-ig-elevated">
      <ParallaxBackground />
      <div data-section="pathway" className="relative z-10 px-3 pb-16 pt-10 md:px-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 bottom-0 -translate-x-1/2 border-l-2 border-dashed border-brand-500/40"
        />
        <div className="relative z-10 mx-auto flex max-w-[440px] flex-col gap-10">
          {rows.map((row) => {
            if (row.kind === 'day') {
              return (
                <div key={row.key} data-section={`day-${row.dayNumber}`} className="flex items-center justify-center pt-2">
                  <span className="inline-flex items-center gap-2 rounded-full border-2 border-brand-500/40 bg-ig-elevated/95 px-5 py-1.5 font-display text-xs font-black uppercase tracking-[0.16em] text-brand-500 shadow-md backdrop-blur">
                    Day {row.dayNumber}
                  </span>
                </div>
              );
            }
            const localIndex = cardCursor++;
            const { item, index } = row;
            return (
              <PathwayNode
                key={row.key}
                ref={(el) => {
                  cardRefs.current[localIndex] = el;
                }}
                item={item}
                place={placeLookup.get(item.placeId)}
                index={index}
                visited={!!visitedMap[item.id]}
                scheduledLabel={scheduledLabelFor(item)}
                onSelect={() => setActiveItem(item)}
                onToggleVisited={() => onToggleVisited(item)}
              />
            );
          })}
          {visibleItems.length === 0 && (
            <p className="py-12 text-center text-sm text-ig-text-tertiary">
              No places in this guide yet.
            </p>
          )}
        </div>
      </div>
      {activeItem && (
        <PathwayPlaceSheet
          item={activeItem}
          place={placeLookup.get(activeItem.placeId)}
          visited={!!visitedMap[activeItem.id]}
          onToggleVisited={() => onToggleVisited(activeItem)}
          onClose={() => setActiveItem(null)}
        />
      )}
    </div>
  );
}
