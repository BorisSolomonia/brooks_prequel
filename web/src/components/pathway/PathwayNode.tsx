'use client';

import Image from 'next/image';
import type { MyTripItem, GuidePlace } from '@/types';

type Props = {
  item: MyTripItem;
  place: GuidePlace | undefined;
  globalIndex: number;
  side: 'left' | 'right';
  visited: boolean;
  onSelect: () => void;
  onToggleVisited: () => void;
  innerRef: (el: HTMLDivElement | null) => void;
};

export default function PathwayNode({
  item,
  place,
  globalIndex,
  side,
  visited,
  onSelect,
  onToggleVisited,
  innerRef,
}: Props) {
  const photo = place?.images?.[0]?.imageUrl ?? null;
  const tag = place?.tags?.[0] ?? null;
  const number = globalIndex + 1;

  return (
    <div
      className={`flex w-full items-center gap-3 ${side === 'right' ? 'flex-row-reverse pl-8' : 'pr-8'}`}
    >
      <div
        ref={innerRef}
        className="relative flex-shrink-0"
      >
        <button
          type="button"
          onClick={onSelect}
          className={`relative block h-20 w-20 overflow-hidden rounded-full border-4 shadow-lg transition-transform hover:scale-105 active:scale-95 ${
            visited ? 'border-brand-500' : 'border-ig-elevated'
          }`}
          aria-label={`Open ${item.placeName}`}
        >
          {photo ? (
            <Image
              src={photo}
              alt={item.placeName}
              fill
              sizes="80px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-brand-200 text-2xl text-brand-700">
              📍
            </div>
          )}
          {visited && (
            <div className="absolute inset-0 bg-brand-500/20" />
          )}
        </button>
        <span
          className={`absolute -bottom-1 ${side === 'left' ? '-right-1' : '-left-1'} flex h-7 w-7 items-center justify-center rounded-full border-2 border-ig-elevated text-xs font-black shadow ${
            visited
              ? 'bg-brand-500 text-white'
              : 'bg-ig-elevated text-brand-500'
          }`}
        >
          {visited ? '✓' : number}
        </span>
      </div>
      <div className={`min-w-0 flex-1 ${side === 'right' ? 'text-right' : 'text-left'}`}>
        <button
          type="button"
          onClick={onSelect}
          className="w-full text-left"
        >
          <h3
            className={`break-words font-display text-sm font-black leading-tight md:text-base ${
              visited ? 'text-ig-text-secondary line-through' : 'text-ig-text-primary'
            }`}
          >
            {item.placeName}
          </h3>
          {tag && (
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-500">
              {tag}
            </p>
          )}
        </button>
        <button
          type="button"
          onClick={onToggleVisited}
          className={`mt-2 inline-flex h-8 items-center gap-1 rounded-full border px-3 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors ${
            visited
              ? 'border-brand-500 bg-brand-500/15 text-brand-500'
              : 'border-ig-border text-ig-text-tertiary hover:border-brand-500/50 hover:text-brand-500'
          }`}
        >
          {visited ? '✓ Visited' : 'Mark visited'}
        </button>
      </div>
    </div>
  );
}
