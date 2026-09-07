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
    <article className={`pc-guide-card ${className}`}>
      <div className="pc-guide-cover">
        <Link href={href} className="block h-full w-full" aria-label={title}>
          {coverImageUrl ? (
            <Image src={coverImageUrl} alt={title} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-ig-text-secondary">{t('guideCard.addCover')}</div>
          )}
        </Link>
        {statusBadge && <span className="pc-badge absolute left-2 top-2">{statusBadge}</span>}
        {showSaveButton && (
          <button type="button" onClick={onSaveClick} className="pc-icon-button pc-guide-save"
            aria-pressed={Boolean(savedByViewer)}
            aria-label={saveLabel ?? (savedByViewer ? t('guideCard.savedGuide') : t('guideCard.saveGuide'))}>
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill={savedByViewer ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <path strokeLinejoin="round" d="M6 3h12v18l-6-4-6 4V3Z" />
            </svg>
          </button>
        )}
      </div>
      <div className="pc-guide-copy">
        {showCreatorBadge && (
          <Link href={creatorHref!} aria-label={t('guideCard.viewProfile', { name: creatorName })} className="pc-guide-creator">
            {creatorAvatarUrl ? <Image src={creatorAvatarUrl} alt="" width={32} height={32} /> : <span className="pc-guide-creator-avatar" aria-hidden="true">{creatorName?.slice(0, 1)}</span>}
            <span className="truncate">{creatorName}</span>
          </Link>
        )}
        <h3 className="pc-guide-title"><Link href={href}>{title}</Link></h3>
        <p className="pc-guide-meta break-words">{location}</p>
        <p className="pc-guide-meta">{duration}{spots > 0 && <> &middot; {t('guideCard.spots', { count: spots })}</>}</p>
        <div className="pc-guide-footer">
          <strong className="text-base text-ig-text-primary">
            {cardPrice <= 0 ? t('guideCard.free') : <>
              {t('guideCard.priceFrom', { amount: formatAmount(cardPrice, currency) })}
              {effectivePriceCents != null && (priceCents ?? 0) > effectivePriceCents && (
                <span className="ml-2 text-xs font-normal text-ig-text-secondary line-through">{formatAmount(priceCents ?? 0, currency)}</span>
              )}
            </>}
          </strong>
          {reviewCount > 0 ? <span className="text-ig-text-secondary"><span className="text-accent-500" aria-hidden="true">&#9733;</span> {averageRating.toFixed(1)} ({reviewCount})</span> : <span className="text-ig-text-secondary">{t('guideCard.noReviews')}</span>}
          {popularThisWeek && <span className="pc-badge">{t('guideCard.popular')}</span>}
        </div>
      </div>
    </article>
  );
}
