'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCurrency } from '@/hooks/useCurrency';

interface GuideCardProps {
  href: string;
  title: string;
  coverImageUrl?: string | null;
  displayLocation?: string | null;
  region?: string | null;
  dayCount?: number;
  spotCount?: number;
  placeCount?: number;
  priceCents?: number;
  effectivePriceCents?: number;
  currency?: string;
  averageRating?: number;
  reviewCount?: number;
  popularThisWeek?: boolean;
  savedByViewer?: boolean;
  onSaveClick?: () => void;
  saveLabel?: string;
  showSaveButton?: boolean;
  statusBadge?: string | null;
  className?: string;
}


function formatDuration(dayCount?: number) {
  if (!dayCount) {
    return 'Guide';
  }
  return `${dayCount}-day guide`;
}

export default function GuideCard({
  href,
  title,
  coverImageUrl,
  displayLocation,
  region,
  dayCount,
  spotCount,
  placeCount,
  priceCents,
  effectivePriceCents,
  currency = 'USD',
  averageRating = 0,
  reviewCount = 0,
  popularThisWeek,
  savedByViewer,
  onSaveClick,
  saveLabel,
  showSaveButton = true,
  statusBadge,
  className = '',
}: GuideCardProps) {
  const { formatAmount } = useCurrency();
  const location = displayLocation || region || 'Destination';
  const spots = spotCount ?? placeCount ?? 0;
  const cardPrice = effectivePriceCents ?? priceCents ?? 0;

  return (
    <article className={`mw-card overflow-hidden rounded-xl transition duration-200 hover:-translate-y-0.5 hover:border-brand-500/60 ${className}`}>
      <div className="mw-photo-frame relative aspect-[4/3] bg-ig-secondary">
        <Link href={href} className="block h-full w-full" aria-label={title}>
          {coverImageUrl ? (
            <Image
              src={coverImageUrl}
              alt={title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover saturate-[0.92] contrast-[1.04]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-ig-text-primary">
              Add cover image
            </div>
          )}
        </Link>

        {statusBadge && (
          <span className="mw-badge absolute left-3 top-3 rounded-md px-2.5 py-1 text-xs">
            {statusBadge}
          </span>
        )}

        {showSaveButton && (
          <button
            type="button"
            onClick={onSaveClick}
            className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full border-2 border-ig-border bg-black/60 text-white shadow-lg backdrop-blur transition hover:bg-black/80"
            aria-label={saveLabel ?? (savedByViewer ? 'Saved guide' : 'Save guide')}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill={savedByViewer ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />
            </svg>
          </button>
        )}
      </div>

      <Link href={href} className="block p-4">
        <h3 className="font-display line-clamp-2 text-base font-black leading-5 text-ig-text-primary">
          {title}
        </h3>
        <p className="mt-2 text-sm text-ig-text-secondary">
          {location} - {formatDuration(dayCount)} - {spots} {spots === 1 ? 'spot' : 'spots'}
        </p>
        <p className="mt-1 text-sm text-ig-text-tertiary">
          {spots} {spots === 1 ? 'spot' : 'spots'} included
        </p>

        <div className="mt-3 min-h-6">
          {popularThisWeek && (
            <span className="mw-badge inline-flex rounded-full px-3 py-1 text-xs">
              Popular this week
            </span>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="min-w-0 text-sm text-ig-text-secondary">
            {reviewCount > 0 ? (
              <span className="font-medium text-ig-text-primary"><span className="text-accent-500">&#9733;</span> {averageRating.toFixed(1)} <span className="text-ig-text-tertiary">({reviewCount})</span></span>
            ) : (
              <span>No reviews yet</span>
            )}
          </div>
          <p className="font-display shrink-0 text-sm font-black text-accent-500">
            {cardPrice <= 0 ? 'Free' : `From ${formatAmount(cardPrice, 0)}`}
          </p>
        </div>
      </Link>
    </article>
  );
}
