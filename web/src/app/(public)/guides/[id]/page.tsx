'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { GuidePreview } from '@/types';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function seasonIsNow(start: number | null | undefined, end: number | null | undefined): boolean {
  if (!start || !end) return false;
  const m = new Date().getMonth() + 1;
  if (start <= end) return m >= start && m <= end;
  return m >= start || m <= end;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-yellow-400 text-sm">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={s <= Math.round(rating) ? 'text-yellow-400' : 'text-ig-border'}>★</span>
      ))}
    </span>
  );
}

export default function PublicGuidePreviewPage() {
  const params = useParams();
  const guideId = params.id as string;
  const [preview, setPreview] = useState<GuidePreview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<GuidePreview>(`/api/guides/${guideId}/preview`)
      .then((r) => setPreview(r))
      .catch(() => setPreview(null))
      .finally(() => setLoading(false));
  }, [guideId]);

  if (loading) {
    return <div className="max-w-3xl mx-auto px-4 py-12 text-center text-ig-text-tertiary">Loading...</div>;
  }

  if (!preview) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-ig-error">Guide not found</p>
      </div>
    );
  }

  const inSeason = seasonIsNow(preview.bestSeasonStartMonth, preview.bestSeasonEndMonth);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="mb-6">
        {preview.coverImageUrl && (
          <div className="h-52 rounded-xl overflow-hidden mb-4 bg-ig-secondary relative">
            <img src={preview.coverImageUrl} alt="" className="w-full h-full object-cover" />
            {preview.bestSeasonLabel && (
              <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold ${
                inSeason ? 'bg-green-500/90 text-white' : 'bg-black/60 text-white/80'
              }`}>
                {inSeason ? 'In season now' : `Best in ${MONTH_NAMES[(preview.bestSeasonStartMonth ?? 1) - 1]}`}
              </span>
            )}
          </div>
        )}

        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold text-ig-text-primary mb-1">{preview.title}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-ig-text-tertiary">
              {preview.region && <span>{preview.region}</span>}
              <span>{preview.dayCount} days</span>
              <span>{preview.placeCount} places</span>
              {preview.priceCents > 0 && (
                <span className="text-ig-text-primary font-semibold">
                  ${(preview.priceCents / 100).toFixed(2)}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-start gap-1 text-xs text-ig-text-tertiary sm:items-end">
            {(preview.purchaseCount ?? 0) > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-ig-elevated border border-ig-border font-medium">
                {preview.purchaseCount} travelers used this
              </span>
            )}
            {(preview.reviewCount ?? 0) > 0 && (
              <span className="flex items-center gap-1.5">
                <StarRating rating={preview.averageRating ?? 0} />
                <span>{(preview.averageRating ?? 0).toFixed(1)} ({preview.reviewCount})</span>
              </span>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link
            href="/api/auth/login"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-ig-blue px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ig-blue-hover sm:w-auto"
          >
            {preview.priceCents > 0 ? 'Sign in to purchase' : 'Sign in to save'}
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        {preview.firstDay && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-semibold text-ig-blue">Day {preview.firstDay.dayNumber}</span>
              {preview.firstDay.title && <span className="text-sm text-ig-text-primary">{preview.firstDay.title}</span>}
            </div>
            {preview.firstDay.description && (
              <p className="text-sm text-ig-text-secondary mb-3">{preview.firstDay.description}</p>
            )}
            <div className="space-y-3 ml-4 border-l-2 border-ig-border pl-4">
              {preview.firstDay.blocks.map((block, bi) => (
                <div key={bi}>
                  {block.title && <h3 className="text-sm font-semibold text-ig-text-primary mb-1">{block.title}</h3>}
                  {block.description && <p className="text-sm text-ig-text-secondary mb-2">{block.description}</p>}
                  <div className="space-y-2">
                    {block.places.map((place, pi) => (
                      <div key={pi} className="p-3 bg-ig-elevated border border-ig-border rounded-lg">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-semibold text-ig-text-primary">{place.name}</h4>
                            {place.address && <p className="text-xs text-ig-text-tertiary mt-0.5">{place.address}</p>}
                          </div>
                          {place.suggestedDurationMinutes && (
                            <span className="text-xs text-ig-text-tertiary flex-shrink-0">{place.suggestedDurationMinutes} min</span>
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
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-ig-border bg-ig-elevated/40 p-5 opacity-60"
          >
            <div>
              <p className="text-sm font-semibold text-brand-400">Day {stub.dayNumber}</p>
              {stub.title && <p className="text-sm text-ig-text-secondary mt-0.5">{stub.title}</p>}
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-ig-border text-ig-text-tertiary">
              Purchase to unlock
            </span>
          </div>
        ))}
      </div>

      {(preview.recentReviews?.length ?? 0) > 0 && (
        <div className="mt-10">
          <h2 className="text-base font-semibold text-ig-text-primary mb-4">
            Traveler reviews
            {(preview.reviewCount ?? 0) > 0 && (
              <span className="ml-2 text-sm font-normal text-ig-text-tertiary">
                {(preview.averageRating ?? 0).toFixed(1)} avg · {preview.reviewCount} reviews
              </span>
            )}
          </h2>
          <div className="space-y-3">
            {(preview.recentReviews ?? []).map((r, i) => (
              <div key={i} className="rounded-xl border border-ig-border bg-ig-elevated p-4">
                <div className="flex items-center gap-2 mb-1">
                  <StarRating rating={r.rating} />
                  <span className="text-xs text-ig-text-tertiary">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {r.reviewText && <p className="text-sm text-ig-text-secondary">{r.reviewText}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
