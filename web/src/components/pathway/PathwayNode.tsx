'use client';

import { forwardRef } from 'react';
import PlaceCarousel from '@/components/places/PlaceCarousel';
import type { MyTripItem, GuidePlace } from '@/types';

type Props = {
  item: MyTripItem;
  place: GuidePlace | undefined;
  index: number;
  visited: boolean;
  scheduledLabel: string | null;
  onSelect: () => void;
  onToggleVisited: () => void;
};

function buildMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

const PathwayNode = forwardRef<HTMLDivElement, Props>(function PathwayNode(
  { item, place, index, visited, scheduledLabel, onSelect, onToggleVisited },
  ref,
) {
  const tags = place?.tags ?? [];
  const description = place?.description ?? null;
  const number = index + 1;

  return (
    <div
      ref={ref}
      data-pathway-card
      className="pathway-card relative mx-auto w-full max-w-[420px] origin-center will-change-[transform,opacity] transition-[transform,opacity] duration-150 ease-out"
    >
      <div className="relative overflow-hidden rounded-2xl border-2 border-ig-border bg-ig-elevated shadow-xl">
        {place && place.images.length > 0 ? (
          <div className="relative aspect-[16/10] w-full bg-ig-primary">
            <PlaceCarousel images={place.images} altPrefix={item.placeName} />
            <span className="absolute left-3 top-3 inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-black/55 px-2 text-[11px] font-black text-white backdrop-blur">
              {visited ? '✓' : number}
            </span>
            {scheduledLabel && (
              <span className="absolute right-3 top-3 inline-flex items-center rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
                {scheduledLabel}
              </span>
            )}
          </div>
        ) : (
          <div className="relative flex aspect-[16/10] w-full items-center justify-center bg-brand-200 text-4xl text-brand-700">
            📍
            <span className="absolute left-3 top-3 inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-black/55 px-2 text-[11px] font-black text-white backdrop-blur">
              {visited ? '✓' : number}
            </span>
            {scheduledLabel && (
              <span className="absolute right-3 top-3 inline-flex items-center rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
                {scheduledLabel}
              </span>
            )}
          </div>
        )}
        <div className="space-y-2.5 p-4">
          <button type="button" onClick={onSelect} className="block w-full text-left">
            <h3
              className={`font-display text-base font-black leading-tight md:text-lg ${
                visited ? 'text-ig-text-secondary line-through' : 'text-ig-text-primary'
              }`}
            >
              {item.placeName}
            </h3>
            {item.placeAddress && (
              <p className="mt-0.5 text-xs text-ig-text-tertiary line-clamp-1">{item.placeAddress}</p>
            )}
          </button>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.slice(0, 3).map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-brand-500/30 bg-brand-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-brand-500"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
          {description && (
            <p className="text-xs leading-relaxed text-ig-text-secondary line-clamp-3">{description}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onToggleVisited}
              className={`inline-flex min-h-9 items-center gap-1 rounded-full border px-3 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors ${
                visited
                  ? 'border-brand-500 bg-brand-500/15 text-brand-500'
                  : 'border-ig-border text-ig-text-secondary hover:border-brand-500/50 hover:text-brand-500'
              }`}
            >
              {visited ? '✓ Visited' : 'Mark visited'}
            </button>
            {item.latitude !== null && item.longitude !== null && (
              <a
                href={buildMapsUrl(item.latitude, item.longitude)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-9 items-center gap-1 rounded-full border border-ig-border px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-ig-text-secondary transition-colors hover:border-brand-500/50 hover:text-brand-500"
              >
                Open in Maps
              </a>
            )}
            <button
              type="button"
              onClick={onSelect}
              className="ml-auto text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-500 hover:text-brand-400"
            >
              More →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default PathwayNode;
