'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import type { MyTripItem, GuidePlace } from '@/types';
import PathwayPlaceSheet from './PathwayPlaceSheet';

type Props = {
  items: MyTripItem[];
  placeLookup: Map<string, GuidePlace>;
  visitedMap: Record<string, boolean>;
  onToggleVisited: (item: MyTripItem) => void;
};

function formatTime(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function SimpleAgenda({ items, placeLookup, visitedMap, onToggleVisited }: Props) {
  const [activeItem, setActiveItem] = useState<MyTripItem | null>(null);
  const sectionRefs = useRef<Record<number, HTMLElement | null>>({});

  const visibleItems = useMemo(
    () =>
      items
        .filter((i) => !i.skipped)
        .sort((a, b) =>
          a.dayNumber !== b.dayNumber
            ? a.dayNumber - b.dayNumber
            : a.blockPosition !== b.blockPosition
            ? a.blockPosition - b.blockPosition
            : a.placePosition - b.placePosition,
        ),
    [items],
  );

  const days = useMemo(
    () => Array.from(new Set(visibleItems.map((i) => i.dayNumber))).sort((a, b) => a - b),
    [visibleItems],
  );

  const itemsByDay = useMemo(() => {
    const map = new Map<number, MyTripItem[]>();
    for (const item of visibleItems) {
      const arr = map.get(item.dayNumber) ?? [];
      arr.push(item);
      map.set(item.dayNumber, arr);
    }
    return map;
  }, [visibleItems]);

  const [activeDay, setActiveDay] = useState<number | null>(days[0] ?? null);

  useEffect(() => {
    if (days.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        let best: IntersectionObserverEntry | null = null;
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          if (!best || e.intersectionRatio > best.intersectionRatio) best = e;
        }
        if (best) {
          const day = Number((best.target as HTMLElement).getAttribute('data-day'));
          if (!Number.isNaN(day)) setActiveDay(day);
        }
      },
      { rootMargin: '-30% 0px -50% 0px', threshold: [0, 0.25, 0.5] },
    );
    days.forEach((d) => {
      const el = sectionRefs.current[d];
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [days]);

  const handleDayClick = (d: number) => {
    const el = sectionRefs.current[d];
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-ig-border bg-ig-elevated">
      <div className="sticky top-16 z-10 flex gap-1.5 overflow-x-auto border-b-2 border-ig-border bg-ig-elevated/95 px-3 py-2 backdrop-blur-md md:top-[60px]">
        {days.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => handleDayClick(d)}
            className={`min-h-9 shrink-0 rounded-full border-2 px-4 py-1.5 font-display text-xs font-black uppercase tracking-[0.08em] transition-colors ${
              d === activeDay
                ? 'border-brand-500 bg-brand-500 text-white'
                : 'border-ig-border text-ig-text-secondary hover:border-brand-500/40 hover:text-ig-text-primary'
            }`}
          >
            Day {d}
          </button>
        ))}
      </div>
      <div className="px-3 py-4 md:px-4">
        {days.map((d) => (
          <section
            key={d}
            ref={(el) => {
              sectionRefs.current[d] = el;
            }}
            data-day={d}
            className="mb-6 scroll-mt-[120px] last:mb-0"
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="inline-flex h-2 w-2 rounded-full bg-brand-500" />
              <h3 className="font-display text-xs font-black uppercase tracking-[0.12em] text-brand-500">
                Day {d}
              </h3>
              <span className="text-[10px] text-ig-text-tertiary">
                {itemsByDay.get(d)?.length ?? 0}{' '}
                {(itemsByDay.get(d)?.length ?? 0) === 1 ? 'place' : 'places'}
              </span>
            </div>
            <ul className="space-y-2">
              {(itemsByDay.get(d) ?? []).map((item) => {
                const place = placeLookup.get(item.placeId);
                const photo = place?.images?.[0]?.imageUrl ?? null;
                const time = formatTime(item.scheduledStart);
                const tag = place?.tags?.[0] ?? null;
                const visited = !!visitedMap[item.id];
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setActiveItem(item)}
                      className={`flex w-full items-center gap-3 rounded-xl border bg-ig-primary p-2.5 text-left transition-colors hover:border-brand-500/40 ${
                        visited ? 'border-brand-500/40' : 'border-ig-border'
                      }`}
                    >
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-ig-elevated">
                        {photo ? (
                          <Image
                            src={photo}
                            alt={item.placeName}
                            fill
                            sizes="64px"
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-2xl">
                            📍
                          </div>
                        )}
                        {visited && (
                          <div className="absolute inset-0 flex items-center justify-center bg-brand-500/40">
                            <span className="rounded-full bg-brand-500 px-1.5 text-[10px] font-bold text-white">
                              ✓
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {time && (
                            <span className="rounded-md bg-brand-500/15 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-brand-500">
                              {time}
                            </span>
                          )}
                          {tag && (
                            <span className="truncate text-[10px] font-semibold uppercase tracking-[0.06em] text-ig-text-tertiary">
                              {tag}
                            </span>
                          )}
                        </div>
                        <h4
                          className={`mt-0.5 font-display text-sm font-black leading-tight ${
                            visited ? 'text-ig-text-secondary line-through' : 'text-ig-text-primary'
                          }`}
                        >
                          {item.placeName}
                        </h4>
                        {item.placeAddress && (
                          <p className="mt-0.5 truncate text-xs text-ig-text-tertiary">
                            {item.placeAddress}
                          </p>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        {visibleItems.length === 0 && (
          <p className="py-12 text-center text-sm text-ig-text-tertiary">
            No places in this guide yet.
          </p>
        )}
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
