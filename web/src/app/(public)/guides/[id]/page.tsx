import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import StarRating from '@/components/reviews/StarRating';
import type { GuidePreview } from '@/types';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const API_INTERNAL = process.env.API_INTERNAL_BASE_URL ?? 'http://backend:8080';

function seasonIsNow(start: number | null | undefined, end: number | null | undefined): boolean {
  if (!start || !end) return false;
  const month = new Date().getMonth() + 1;
  if (start <= end) return month >= start && month <= end;
  return month >= start || month <= end;
}

async function getPreview(guideId: string): Promise<GuidePreview | null> {
  const res = await fetch(`${API_INTERNAL}/api/guides/${guideId}/preview`, {
    headers: { 'Content-Type': 'application/json' },
    next: { revalidate: 60 },
  });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return res.json();
}

export default async function PublicGuidePreviewPage({ params }: { params: { id: string } }) {
  const preview = await getPreview(params.id);

  if (!preview) {
    notFound();
  }

  const inSeason = seasonIsNow(preview.bestSeasonStartMonth, preview.bestSeasonEndMonth);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6">
        {preview.coverImageUrl && (
          <div className="mw-photo-frame relative mb-4 h-52 overflow-hidden rounded-xl bg-ig-secondary">
            <Image
              src={preview.coverImageUrl}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              priority
              className="object-cover saturate-[0.92] contrast-[1.04]"
            />
            {preview.bestSeasonLabel && (
              <span className={`absolute right-3 top-3 rounded-full border-2 border-white/30 px-2.5 py-1 text-xs font-semibold ${
                inSeason ? 'bg-brand-500 text-white' : 'bg-black/70 text-white/80'
              }`}>
                {inSeason ? 'In season now' : `Best in ${MONTH_NAMES[(preview.bestSeasonStartMonth ?? 1) - 1]}`}
              </span>
            )}
          </div>
        )}

        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
          <div className="min-w-0 flex-1">
            <h1 className="mw-section-title mb-1 text-2xl">{preview.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-ig-text-tertiary">
              {preview.region && <span>{preview.region}</span>}
              <span>{preview.dayCount} days</span>
              <span>{preview.placeCount} places</span>
              {preview.priceCents > 0 && (
                <span className="font-display font-black text-accent-500">
                  ${(preview.priceCents / 100).toFixed(2)}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-start gap-1 text-xs text-ig-text-tertiary sm:items-end">
            {(preview.purchaseCount ?? 0) > 0 && (
              <span className="mw-badge">
                {preview.purchaseCount} travelers used this
              </span>
            )}
            {(preview.reviewCount ?? 0) > 0 && (
              <span className="flex items-center gap-1.5">
                <StarRating rating={preview.averageRating ?? 0} size="sm" />
                <span>{(preview.averageRating ?? 0).toFixed(1)} ({preview.reviewCount})</span>
              </span>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link
            href="/api/auth/login"
            className="mw-button-primary min-h-11 w-full rounded-lg px-6 py-2.5 text-sm sm:w-auto"
          >
            {preview.priceCents > 0 ? 'Sign in to purchase' : 'Sign in to save'}
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        {preview.firstDay && (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="mw-badge">Day {preview.firstDay.dayNumber}</span>
              {preview.firstDay.title && <span className="text-sm font-semibold text-ig-text-primary">{preview.firstDay.title}</span>}
            </div>
            {preview.firstDay.description && (
              <p className="mb-3 text-sm text-ig-text-secondary">{preview.firstDay.description}</p>
            )}
            <div className="ml-4 space-y-3 border-l-2 border-ig-border pl-4">
              {preview.firstDay.blocks.map((block, blockIndex) => (
                <div key={blockIndex}>
                  {block.title && <h3 className="mb-1 font-display text-sm font-black text-ig-text-primary">{block.title}</h3>}
                  {block.description && <p className="mb-2 text-sm text-ig-text-secondary">{block.description}</p>}
                  <div className="space-y-2">
                    {block.places.map((place, placeIndex) => (
                      <div key={placeIndex} className="mw-card p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-display text-sm font-black text-ig-text-primary">{place.name}</h4>
                            {place.address && <p className="mt-0.5 text-xs text-ig-text-tertiary">{place.address}</p>}
                          </div>
                          {place.suggestedDurationMinutes && (
                            <span className="flex-shrink-0 text-xs text-ig-text-tertiary">{place.suggestedDurationMinutes} min</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(preview.lockedDays ?? []).map((stub) => (
          <div
            key={stub.dayNumber}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-dashed border-ig-border bg-ig-elevated/40 p-5 opacity-70"
          >
            <div>
              <p className="font-display text-sm font-black text-brand-400">Day {stub.dayNumber}</p>
              {stub.title && <p className="mt-0.5 text-sm text-ig-text-secondary">{stub.title}</p>}
            </div>
            <span className="mw-badge">Purchase to unlock</span>
          </div>
        ))}
      </div>

      {(preview.recentReviews?.length ?? 0) > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 font-display text-base font-black text-ig-text-primary">
            Traveler reviews
            {(preview.reviewCount ?? 0) > 0 && (
              <span className="ml-2 font-sans text-sm font-normal text-ig-text-tertiary">
                {(preview.averageRating ?? 0).toFixed(1)} avg - {preview.reviewCount} reviews
              </span>
            )}
          </h2>
          <div className="space-y-3">
            {(preview.recentReviews ?? []).map((review, index) => (
              <div key={index} className="mw-card p-4">
                <div className="mb-1 flex items-center gap-2">
                  <StarRating rating={review.rating} />
                  <span className="text-xs text-ig-text-tertiary">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {review.reviewText && <p className="text-sm text-ig-text-secondary">{review.reviewText}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
