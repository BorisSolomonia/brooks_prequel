'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
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
  // BOR-42 edge-floating creator badge. Rendered only when both a name and a
  // profile href are supplied (opt-in — e.g. the creator's own profile page
  // passes neither, so its cards show no badge). The badge is a SEPARATE link
  // from the main card link, so tapping it routes to the creator, not the guide.
  creatorName?: string | null;
  creatorAvatarUrl?: string | null;
  creatorHref?: string | null;
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
  // GEL fallback — matches backend Guide entity default. The display
  // layer pins to GEL anyway via useCurrency, but a sensible fallback
  // here keeps the prop semantically aligned.
  currency = 'GEL',
  averageRating = 0,
  reviewCount = 0,
  popularThisWeek,
  savedByViewer,
  onSaveClick,
  saveLabel,
  showSaveButton = true,
  statusBadge,
  className = '',
  creatorName,
  creatorAvatarUrl,
  creatorHref,
}: GuideCardProps) {
  const { t } = useTranslation();
  const { formatAmount } = useCurrency();
  const location = displayLocation || region || t('guideCard.destination');
  const duration = dayCount ? t('guideCard.durationDays', { count: dayCount }) : t('guideCard.durationGuide');
  const spots = spotCount ?? placeCount ?? 0;
  const cardPrice = effectivePriceCents ?? priceCents ?? 0;
  const showCreatorBadge = Boolean(creatorName && creatorHref);

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
              {t('guideCard.addCover')}
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
            aria-label={saveLabel ?? (savedByViewer ? t('guideCard.savedGuide') : t('guideCard.saveGuide'))}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill={savedByViewer ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />
            </svg>
          </button>
        )}
      </div>

      <div className="relative">
        {/* BOR-42: edge-floating creator badge. A SEPARATE link (z-30, sits on
            top of the card link below) so tapping it routes to the creator, not
            the guide. It straddles the photo/details divider via -top-7 on this
            56px avatar (centred on the line). The article is overflow-hidden but
            the badge is interior (left-4) so it is never clipped. */}
        {showCreatorBadge && (
          <Link
            href={creatorHref!}
            aria-label={t('guideCard.viewProfile', { name: creatorName })}
            className="group/badge absolute -top-7 left-4 z-30 inline-flex flex-col items-start"
          >
            <span className="relative">
              {/* 1980s Memphis-style geometric accents behind the avatar */}
              <span aria-hidden className="absolute -right-1.5 -top-1.5 h-4 w-4 rotate-45 rounded-[3px] bg-brand-500 shadow-sm" />
              <span aria-hidden className="absolute -bottom-1 -left-1.5 h-2.5 w-2.5 rounded-full bg-accent-400" />
              {/* Avatar in a vibrant tanned (accent) border, ringed against the dark container */}
              <span className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-4 border-accent-500 bg-gradient-to-br from-brand-500 to-accent-500 shadow-lg ring-2 ring-ig-elevated transition group-hover/badge:border-accent-400">
                {creatorAvatarUrl ? (
                  <Image src={creatorAvatarUrl} alt={creatorName ?? ''} width={56} height={56} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-lg font-black text-white">{(creatorName ?? '?').charAt(0).toUpperCase()}</span>
                )}
              </span>
            </span>
            <span className="mt-1 max-w-[8.5rem] truncate text-xs font-medium text-ig-text-secondary group-hover/badge:text-brand-500">
              {t('guideCard.byCreator', { name: creatorName })}
            </span>
          </Link>
        )}

        <Link href={href} className={`block p-4 ${showCreatorBadge ? 'pt-12' : ''}`}>
          <h3 className="font-display line-clamp-2 text-base font-black leading-5 text-ig-text-primary">
            {title}
          </h3>
          <p className="mt-2 text-sm text-ig-text-secondary">
            {location} - {duration} - {t('guideCard.spots', { count: spots })}
          </p>
          <p className="mt-1 text-sm text-ig-text-tertiary">
          {t('guideCard.spotsIncluded', { count: spots })}
        </p>

        <div className="mt-3 min-h-6">
          {popularThisWeek && (
            <span className="mw-badge inline-flex rounded-full px-3 py-1 text-xs">
              {t('guideCard.popular')}
            </span>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="min-w-0 text-sm text-ig-text-secondary">
            {reviewCount > 0 ? (
              <span className="font-medium text-ig-text-primary"><span className="text-accent-500">&#9733;</span> {averageRating.toFixed(1)} <span className="text-ig-text-tertiary">({reviewCount})</span></span>
            ) : (
              <span>{t('guideCard.noReviews')}</span>
            )}
          </div>
          <p className="font-display shrink-0 text-sm font-black text-accent-500">
            {cardPrice <= 0 ? t('guideCard.free') : (
              (effectivePriceCents != null && (priceCents ?? 0) > effectivePriceCents) ? (
                <>
                  {t('guideCard.priceFrom', { amount: formatAmount(effectivePriceCents, currency) })}{' '}
                  <span className="text-xs font-normal text-ig-text-tertiary line-through">
                    {formatAmount(priceCents ?? 0, currency)}
                  </span>
                </>
              ) : t('guideCard.priceFrom', { amount: formatAmount(cardPrice, currency) })
            )}
          </p>
        </div>
        </Link>
      </div>
    </article>
  );
}
