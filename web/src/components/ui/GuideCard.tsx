'use client';

import Link from 'next/link';

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

function formatPrice(cents: number | undefined, currency = 'USD') {
  const amount = cents ?? 0;
  if (amount <= 0) {
    return 'Free';
  }
  const symbol = currency === 'USD' ? '$' : `${currency} `;
  return `From ${symbol}${(amount / 100).toFixed(0)}`;
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
  const location = displayLocation || region || 'Destination';
  const spots = spotCount ?? placeCount ?? 0;
  const cardPrice = effectivePriceCents ?? priceCents ?? 0;

  return (
    <article className={`overflow-hidden rounded-lg border border-ig-border bg-ig-elevated transition hover:border-brand-500/50 ${className}`}>
      <div className="relative aspect-[4/3] bg-ig-secondary">
        <Link href={href} className="block h-full w-full" aria-label={title}>
          {coverImageUrl ? (
            <img src={coverImageUrl} alt={title} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-ig-secondary text-sm text-ig-text-tertiary">
              Add cover image
            </div>
          )}
        </Link>

        {statusBadge && (
          <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-xs font-semibold text-white">
            {statusBadge}
          </span>
        )}

        {showSaveButton && (
          <button
            type="button"
            onClick={onSaveClick}
            className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white shadow-lg backdrop-blur transition hover:bg-black/75"
            aria-label={saveLabel ?? (savedByViewer ? 'Saved guide' : 'Save guide')}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill={savedByViewer ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />
            </svg>
          </button>
        )}
      </div>

      <Link href={href} className="block p-4">
        <h3 className="line-clamp-2 text-base font-semibold leading-5 text-ig-text-primary">
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
            <span className="inline-flex rounded-full bg-brand-500/15 px-3 py-1 text-xs font-semibold text-brand-500">
              Popular this week
            </span>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="min-w-0 text-sm text-ig-text-secondary">
            {reviewCount > 0 ? (
              <span className="font-medium text-ig-text-primary">&#9733; {averageRating.toFixed(1)} <span className="text-ig-text-tertiary">({reviewCount})</span></span>
            ) : (
              <span>No reviews yet</span>
            )}
          </div>
          <p className="shrink-0 text-sm font-semibold text-ig-text-primary">
            {formatPrice(cardPrice, currency)}
          </p>
        </div>
      </Link>
    </article>
  );
}
