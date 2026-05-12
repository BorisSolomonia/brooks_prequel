'use client';

import { useEffect } from 'react';
import PlaceCarousel from '@/components/places/PlaceCarousel';
import type { MyTripItem, GuidePlace } from '@/types';

type Props = {
  item: MyTripItem;
  place: GuidePlace | undefined;
  visited: boolean;
  onToggleVisited: () => void;
  onClose: () => void;
};

function buildMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export default function PathwayPlaceSheet({ item, place, visited, onToggleVisited, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 px-3 pb-3 sm:items-center sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={item.placeName}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border-2 border-ig-border bg-ig-elevated shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition-colors hover:bg-black/60"
          aria-label="Close"
        >
          ✕
        </button>
        {place && place.images.length > 0 && (
          <div className="aspect-[16/9] w-full">
            <PlaceCarousel images={place.images} altPrefix={item.placeName} />
          </div>
        )}
        <div className="space-y-4 p-5">
          <div>
            <h2 className="font-display text-xl font-black text-ig-text-primary">
              {item.placeName}
            </h2>
            {item.placeAddress && (
              <p className="mt-1 text-sm text-ig-text-secondary">{item.placeAddress}</p>
            )}
          </div>
          {place?.description && (
            <p className="text-sm leading-relaxed text-ig-text-secondary">{place.description}</p>
          )}
          {place?.tags && place.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {place.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-500"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onToggleVisited}
              className={`min-h-11 flex-1 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                visited
                  ? 'border-2 border-brand-500 bg-brand-500/15 text-brand-500'
                  : 'mw-button-primary'
              }`}
            >
              {visited ? '✓ Visited' : 'Mark as visited'}
            </button>
            {item.latitude !== null && item.longitude !== null && (
              <a
                href={buildMapsUrl(item.latitude, item.longitude)}
                target="_blank"
                rel="noreferrer"
                className="mw-button-secondary min-h-11 flex-1 rounded-md px-4 py-2 text-center text-sm"
              >
                Open in Maps
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
