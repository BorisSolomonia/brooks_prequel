'use client';

import { useEffect, useRef, useState } from 'react';
import type { GuidePlaceImage } from '@/types';

interface Props {
  images: GuidePlaceImage[];
  altPrefix: string;
}

export default function PlaceCarousel({ images, altPrefix }: Props) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const handleScroll = () => {
      const index = Math.max(0, Math.min(images.length - 1, Math.round(track.scrollLeft / track.clientWidth)));
      setActiveIndex((current) => (current === index ? current : index));
    };
    track.addEventListener('scroll', handleScroll, { passive: true });
    return () => track.removeEventListener('scroll', handleScroll);
  }, [images.length]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowRight') setLightboxIndex((i) => (i === null ? null : Math.min(images.length - 1, i + 1)));
      if (e.key === 'ArrowLeft') setLightboxIndex((i) => (i === null ? null : Math.max(0, i - 1)));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIndex, images.length]);

  if (images.length === 0) {
    return null;
  }

  return (
    <>
      <div className="relative">
        <div
          ref={trackRef}
          className="flex w-full snap-x snap-mandatory overflow-x-auto scroll-smooth rounded-lg border border-ig-border bg-ig-elevated"
          style={{ scrollbarWidth: 'none' }}
        >
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setLightboxIndex(index)}
              className="relative h-14 w-14 flex-shrink-0 snap-center overflow-hidden md:h-16 md:w-16"
              title={image.caption || `${altPrefix} photo ${index + 1}`}
            >
              <img
                src={image.imageUrl}
                alt={image.caption || `${altPrefix} photo ${index + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
        {images.length > 1 && (
          <div className="mt-1 flex justify-center gap-1">
            {images.map((image, index) => (
              <span
                key={image.id}
                className={`h-1 w-1 rounded-full transition-colors ${
                  index === activeIndex ? 'bg-brand-500' : 'bg-ig-border'
                }`}
                aria-hidden
              />
            ))}
          </div>
        )}
      </div>

      {lightboxIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${altPrefix} photo viewer`}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 py-6"
          onClick={() => setLightboxIndex(null)}
        >
          <div
            className="relative flex w-full max-w-4xl flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={images[lightboxIndex].imageUrl}
              alt={images[lightboxIndex].caption || `${altPrefix} photo ${lightboxIndex + 1}`}
              className="max-h-[80vh] w-auto max-w-full rounded-lg object-contain"
            />
            <div className="flex items-center gap-3">
              {lightboxIndex > 0 && (
                <button
                  type="button"
                  onClick={() => setLightboxIndex(lightboxIndex - 1)}
                  className="min-h-11 rounded-full border border-white/40 bg-black/60 px-4 py-2 text-sm font-semibold text-white"
                >
                  ←
                </button>
              )}
              <span className="text-xs text-white/80">
                {lightboxIndex + 1} / {images.length}
              </span>
              {lightboxIndex < images.length - 1 && (
                <button
                  type="button"
                  onClick={() => setLightboxIndex(lightboxIndex + 1)}
                  className="min-h-11 rounded-full border border-white/40 bg-black/60 px-4 py-2 text-sm font-semibold text-white"
                >
                  →
                </button>
              )}
              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                className="min-h-11 rounded-full border border-white/40 bg-white/10 px-4 py-2 text-sm font-semibold text-white"
                aria-label="Close"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
