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

type FlatRow =
  | { kind: 'day'; dayNumber: number }
  | { kind: 'node'; item: MyTripItem; globalIndex: number; side: 'left' | 'right' };

export default function Pathway({ items, placeLookup, visitedMap, onToggleVisited }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [pathD, setPathD] = useState('');
  const [svgSize, setSvgSize] = useState({ width: 0, height: 0 });
  const [activeItem, setActiveItem] = useState<MyTripItem | null>(null);

  const visibleItems = useMemo(
    () => items.filter((item) => !item.skipped).sort((a, b) =>
      a.dayNumber !== b.dayNumber
        ? a.dayNumber - b.dayNumber
        : a.blockPosition !== b.blockPosition
        ? a.blockPosition - b.blockPosition
        : a.placePosition - b.placePosition,
    ),
    [items],
  );

  const rows = useMemo<FlatRow[]>(() => {
    const list: FlatRow[] = [];
    let lastDay = -1;
    visibleItems.forEach((item, index) => {
      if (item.dayNumber !== lastDay) {
        list.push({ kind: 'day', dayNumber: item.dayNumber });
        lastDay = item.dayNumber;
      }
      list.push({
        kind: 'node',
        item,
        globalIndex: index,
        side: index % 2 === 0 ? 'left' : 'right',
      });
    });
    return list;
  }, [visibleItems]);

  const totalNodes = visibleItems.length;

  useEffect(() => {
    nodeRefs.current = nodeRefs.current.slice(0, totalNodes);
  }, [totalNodes]);

  useEffect(() => {
    const recalc = () => {
      const container = containerRef.current;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      setSvgSize({ width: containerRect.width, height: container.scrollHeight });
      const points: { x: number; y: number }[] = [];
      nodeRefs.current.forEach((nodeEl) => {
        if (!nodeEl) return;
        const r = nodeEl.getBoundingClientRect();
        points.push({
          x: r.left + r.width / 2 - containerRect.left,
          y: r.top + r.height / 2 - containerRect.top + container.scrollTop,
        });
      });
      if (points.length < 2) {
        setPathD('');
        return;
      }
      let d = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const midY = (prev.y + curr.y) / 2;
        d += ` C ${prev.x} ${midY}, ${curr.x} ${midY}, ${curr.x} ${curr.y}`;
      }
      setPathD(d);
    };
    recalc();
    const ro = new ResizeObserver(recalc);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', recalc);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', recalc);
    };
  }, [rows, totalNodes]);

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-ig-border bg-ig-elevated">
      <ParallaxBackground />
      <div ref={containerRef} className="relative z-10 px-3 pb-12 pt-8 md:px-6">
        {pathD && (
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full"
            width={svgSize.width}
            height={svgSize.height}
          >
            <path
              d={pathD}
              fill="none"
              stroke="rgb(var(--brand-500) / 0.55)"
              strokeWidth={3}
              strokeDasharray="4 8"
              strokeLinecap="round"
            />
          </svg>
        )}
        <div className="relative z-10 space-y-8">
          {rows.map((row, i) => {
            if (row.kind === 'day') {
              return (
                <div key={`day-${row.dayNumber}-${i}`} className="flex items-center justify-center pt-2">
                  <span className="inline-flex items-center gap-2 rounded-full border-2 border-brand-500/40 bg-ig-elevated/90 px-4 py-1.5 font-display text-xs font-black uppercase tracking-[0.16em] text-brand-500 shadow-sm backdrop-blur">
                    Day {row.dayNumber}
                  </span>
                </div>
              );
            }
            const { item, globalIndex, side } = row;
            return (
              <PathwayNode
                key={item.id}
                item={item}
                place={placeLookup.get(item.placeId)}
                globalIndex={globalIndex}
                side={side}
                visited={!!visitedMap[item.id]}
                onSelect={() => setActiveItem(item)}
                onToggleVisited={() => onToggleVisited(item)}
                innerRef={(el) => {
                  nodeRefs.current[globalIndex] = el;
                }}
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
