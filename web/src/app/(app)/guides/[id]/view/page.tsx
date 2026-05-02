'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import BuyButton from '@/components/ui/BuyButton';
import ReviewComposer from '@/components/reviews/ReviewComposer';
import ReviewText from '@/components/reviews/ReviewText';
import StarRating from '@/components/reviews/StarRating';
import { api } from '@/lib/api';
import { useAccessToken } from '@/hooks/useAccessToken';
import { useCurrency } from '@/hooks/useCurrency';
import type {
  Guide,
  GuidePreview,
  GuideReviewItem,
  GuideReviewListResponse,
  GuideSaveStatusResponse,
} from '@/types';

type ViewMode = 'loading' | 'owner' | 'buyer' | 'preview';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function seasonIsNow(start: number | null | undefined, end: number | null | undefined): boolean {
  if (!start || !end) return false;
  const month = new Date().getMonth() + 1;
  if (start <= end) return month >= start && month <= end;
  return month >= start || month <= end;
}

export default function ViewGuidePage() {
  const params = useParams();
  const guideId = params.id as string;
  const { token, loading: tokenLoading } = useAccessToken();
  const router = useRouter();
  const { formatAmount } = useCurrency();

  const [mode, setMode] = useState<ViewMode>('loading');
  const [guide, setGuide] = useState<Guide | null>(null);
  const [preview, setPreview] = useState<GuidePreview | null>(null);
  const [tripId, setTripId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [reviews, setReviews] = useState<GuideReviewItem[]>([]);
  const [reviewSummary, setReviewSummary] = useState<GuideReviewListResponse | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  useEffect(() => {
    if (tokenLoading) return;

    const loadData = async () => {
      let previewData: GuidePreview | null = null;
      try {
        previewData = await api.get<GuidePreview>(`/api/guides/${guideId}/preview`);
        setPreview(previewData);
      } catch {
        setPreview(null);
      }

      if (token) {
        try {
          const ownerGuide = await api.get<Guide>(`/api/guides/${guideId}`, token);
          setGuide(ownerGuide);
          setMode('owner');
          setLoading(false);
          return;
        } catch {
          // Not owner.
        }

        try {
          const tripSummary = await api.get<{ id: string }>(`/api/me/trips/by-guide/${guideId}`, token);
          setTripId(tripSummary.id);
          setMode('buyer');
          setLoading(false);
          return;
        } catch {
          // Not buyer.
        }
      }

      setMode('preview');
      setLoading(false);
    };

    loadData();
  }, [guideId, token, tokenLoading]);

  useEffect(() => {
    if (tokenLoading || !token || mode !== 'preview') return;
    api.get<GuideSaveStatusResponse>(`/api/guides/${guideId}/save-status`, token)
      .then((response) => setSaved(response.saved))
      .catch(() => setSaved(false));
  }, [guideId, mode, token, tokenLoading]);

  useEffect(() => {
    if (loading || tokenLoading) {
      return;
    }

    setReviewsLoading(true);
    setReviewsError(null);
    api.get<GuideReviewListResponse>(`/api/guides/${guideId}/reviews`, token || undefined)
      .then((response) => {
        setReviewSummary(response);
        setReviews(response.reviews.content);
      })
      .catch((error) => {
        setReviewsError(error instanceof Error ? error.message : 'Failed to load reviews');
      })
      .finally(() => setReviewsLoading(false));
  }, [guideId, loading, token, tokenLoading]);

  const reloadReviews = async () => {
    const response = await api.get<GuideReviewListResponse>(`/api/guides/${guideId}/reviews`, token || undefined);
    setReviewSummary(response);
    setReviews(response.reviews.content);
    setReviewsError(null);
  };

  const handleSaveToggle = async () => {
    if (!token) return;
    setSaveLoading(true);
    try {
      const response = saved
        ? await api.delete<GuideSaveStatusResponse>(`/api/guides/${guideId}/save`, token)
        : await api.post<GuideSaveStatusResponse>(`/api/guides/${guideId}/save`, undefined, token);
      setSaved(response.saved);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update save state');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleReviewSubmit = async (payload: { rating: number; reviewText: string | null }) => {
    if (!token) {
      throw new Error('Sign in to review this guide');
    }
    await api.post(`/api/guides/${guideId}/reviews/me`, payload, token);
    await reloadReviews();
  };

  const handleReviewDelete = async () => {
    if (!token) {
      throw new Error('Sign in to delete your review');
    }
    await api.delete(`/api/guides/${guideId}/reviews/me`, token);
    await reloadReviews();
  };

  const handleVote = async (reviewId: string, vote: 'HELPFUL' | 'NOT_HELPFUL') => {
    if (!token) {
      router.push('/api/auth/login');
      return;
    }
    try {
      await api.post(`/api/guides/${guideId}/reviews/${reviewId}/vote`, { vote }, token);
      await reloadReviews();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to register vote');
    }
  };

  if (tokenLoading || loading) {
    return <div className="mx-auto max-w-3xl px-4 py-12 text-center text-ig-text-tertiary">Loading...</div>;
  }

  if (!guide && !preview) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <p className="text-ig-error">Guide not found</p>
      </div>
    );
  }

  const displayGuide = guide;
  const displayPreview = preview;
  const inSeason = seasonIsNow(displayPreview?.bestSeasonStartMonth, displayPreview?.bestSeasonEndMonth);
  const averageRating = reviewSummary?.averageRating ?? displayPreview?.averageRating ?? 0;
  const reviewCount = reviewSummary?.reviewCount ?? displayPreview?.reviewCount ?? 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {mode === 'owner' && (
        <div className="mb-4 rounded-lg border border-ig-border bg-ig-elevated px-3 py-2 text-sm text-ig-text-secondary">
          You own this guide.{' '}
          <Link href={`/guides/${guideId}/edit`} className="text-ig-blue hover:underline">Edit</Link>
        </div>
      )}
      {mode === 'buyer' && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3">
          <span className="text-sm text-green-400">You own this guide.</span>
          {tripId && (
            <button
              onClick={() => router.push(`/trips/${tripId}`)}
            className="min-h-11 rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-600"
            >
              Go to your trip
            </button>
          )}
        </div>
      )}

      <div className="mb-6">
        {(displayGuide?.coverImageUrl || displayPreview?.coverImageUrl) && (
          <div className="relative mb-4 h-52 overflow-hidden rounded-xl bg-ig-secondary">
            <img src={displayGuide?.coverImageUrl || displayPreview?.coverImageUrl || ''} alt="" className="h-full w-full object-cover" />
            {displayPreview?.bestSeasonLabel && (
              <span className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold ${
                inSeason ? 'bg-green-500/90 text-white' : 'bg-black/60 text-white/80'
              }`}>
                {inSeason ? 'In season now' : `Best in ${MONTH_NAMES[(displayPreview.bestSeasonStartMonth ?? 1) - 1]}`}
              </span>
            )}
          </div>
        )}

        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
          <div className="min-w-0 flex-1">
            <h1 className="mb-1 text-2xl font-semibold text-ig-text-primary">
              {displayGuide?.title || displayPreview?.title}
            </h1>
            {displayGuide?.description && (
              <p className="text-sm text-ig-text-secondary">{displayGuide.description}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-ig-text-tertiary">
              {(displayGuide?.region || displayPreview?.region) && (
                <span>{displayGuide?.region || displayPreview?.region}</span>
              )}
              <span>{displayGuide?.dayCount || displayPreview?.dayCount} days</span>
              <span>{displayGuide?.placeCount || displayPreview?.placeCount} places</span>
              {mode !== 'buyer' && (displayGuide?.priceCents || displayPreview?.priceCents || 0) > 0 && (
                <span className="font-semibold text-ig-text-primary">
                  {formatAmount((displayGuide?.priceCents ?? displayPreview?.priceCents) ?? 0)}
                </span>
              )}
            </div>
          </div>

          {displayPreview && (
            <div className="flex flex-col items-start gap-1 text-xs text-ig-text-tertiary sm:items-end">
              {(displayPreview.purchaseCount ?? 0) > 0 && (
                <span className="rounded-full border border-ig-border bg-ig-elevated px-2.5 py-1 font-medium">
                  {displayPreview.purchaseCount} travelers used this
                </span>
              )}
              {reviewCount > 0 && (
                <span className="flex items-center gap-1.5">
                  <StarRating rating={averageRating} size="sm" />
                  <span>{averageRating.toFixed(1)} ({reviewCount})</span>
                </span>
              )}
            </div>
          )}
        </div>

        {displayGuide?.tags && displayGuide.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {displayGuide.tags.map((tag) => (
              <span key={tag} className="rounded-full border border-ig-border bg-ig-elevated px-2 py-0.5 text-xs text-ig-text-secondary">
                {tag}
              </span>
            ))}
          </div>
        )}

        {mode === 'preview' && (
          <div className="mt-5 flex flex-wrap items-center gap-3 [&>*]:w-full sm:[&>*]:w-auto">
            {token ? (
              <button
                type="button"
                onClick={handleSaveToggle}
                disabled={saveLoading}
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
                  saved
                    ? 'border-ig-blue bg-ig-blue/10 text-ig-blue'
                    : 'border-ig-border bg-ig-elevated text-ig-text-primary hover:border-ig-blue/40'
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                  <path d="M6 3.75A2.25 2.25 0 0 1 8.25 1.5h7.5A2.25 2.25 0 0 1 18 3.75v18.114a.375.375 0 0 1-.614.291L12 17.72l-5.386 4.435A.375.375 0 0 1 6 21.864V3.75Z" />
                </svg>
                {saveLoading ? 'Saving...' : saved ? 'Saved' : 'Save'}
              </button>
            ) : (
              <Link
                href="/api/auth/login"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-ig-border bg-ig-elevated px-4 py-2.5 text-sm font-semibold text-ig-text-primary hover:border-ig-blue/40"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                  <path d="M6 3.75A2.25 2.25 0 0 1 8.25 1.5h7.5A2.25 2.25 0 0 1 18 3.75v18.114a.375.375 0 0 1-.614.291L12 17.72l-5.386 4.435A.375.375 0 0 1 6 21.864V3.75Z" />
                </svg>
                Sign in to save
              </Link>
            )}

            {displayPreview && token && (
              <BuyButton
                guideId={guideId}
                priceCents={displayPreview.priceCents}
                currency={displayPreview.currency}
                salePriceCents={displayPreview.salePriceCents}
                saleEndsAt={displayPreview.saleEndsAt}
                token={token}
              />
            )}
            {displayPreview && !token && (
              <Link
                href="/api/auth/login"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-ig-blue px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ig-blue-hover"
              >
                {displayPreview.priceCents === 0 ? 'Sign in to get guide' : 'Sign in to purchase'}
              </Link>
            )}
          </div>
        )}
      </div>

      {displayGuide && mode === 'owner' ? (
        <div className="space-y-6">
          {displayGuide.days.map((day) => (
            <div key={day.id}>
              <div className="mb-3 flex items-center gap-2">
                <span className="text-sm font-semibold text-ig-blue">Day {day.dayNumber}</span>
                {day.title && <span className="text-sm text-ig-text-primary">{day.title}</span>}
              </div>
              {day.description && <p className="mb-3 text-sm text-ig-text-secondary">{day.description}</p>}
              <div className="ml-4 space-y-3 border-l-2 border-ig-border pl-4">
                {day.blocks.map((block) => (
                  <div key={block.id}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded-full border border-ig-border bg-ig-elevated px-2 py-0.5 text-xs text-ig-text-secondary">
                        {block.blockType}
                      </span>
                      {block.title && <h3 className="text-sm font-semibold text-ig-text-primary">{block.title}</h3>}
                    </div>
                    {block.description && <p className="mb-2 text-sm text-ig-text-secondary">{block.description}</p>}
                    <div className="space-y-2">
                      {block.places.map((place) => (
                        <div key={place.id} className="rounded-lg border border-ig-border bg-ig-elevated p-3">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-ig-text-primary">{place.name}</h4>
                            {place.sponsored && (
                              <span className="rounded-full bg-accent-500/20 px-1.5 py-0.5 text-xs text-accent-500">Sponsored</span>
                            )}
                          </div>
                          {place.address && <p className="mt-0.5 text-xs text-ig-text-tertiary">{place.address}</p>}
                          {place.description && <p className="mt-1 text-sm text-ig-text-secondary">{place.description}</p>}
                          {place.images && place.images.length > 0 && (
                            <div className="mt-2 flex gap-2">
                              {place.images.map((image) => (
                                <div key={image.id} className="h-20 w-20 overflow-hidden rounded-md bg-ig-secondary">
                                  <img src={image.imageUrl} alt={image.caption || ''} className="h-full w-full object-cover" />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {displayPreview?.firstDay ? (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="text-sm font-semibold text-ig-blue">Day {displayPreview.firstDay.dayNumber}</span>
                {displayPreview.firstDay.title && (
                  <span className="text-sm text-ig-text-primary">{displayPreview.firstDay.title}</span>
                )}
              </div>
              {displayPreview.firstDay.description && (
                <p className="mb-3 text-sm text-ig-text-secondary">{displayPreview.firstDay.description}</p>
              )}
              <div className="ml-4 space-y-3 border-l-2 border-ig-border pl-4">
                {displayPreview.firstDay.blocks.map((block, blockIndex) => (
                  <div key={blockIndex}>
                    {block.title && <h3 className="mb-1 text-sm font-semibold text-ig-text-primary">{block.title}</h3>}
                    {block.description && <p className="mb-2 text-sm text-ig-text-secondary">{block.description}</p>}
                    <div className="space-y-2">
                      {block.places.map((place, placeIndex) => (
                        <div key={placeIndex} className="rounded-lg border border-ig-border bg-ig-elevated p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="text-sm font-semibold text-ig-text-primary">{place.name}</h4>
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
          ) : null}

          {(displayPreview?.lockedDays ?? []).map((stub) => (
            <div
              key={stub.dayNumber}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-ig-border bg-ig-elevated/40 p-5 opacity-60"
            >
              <div>
                <p className="text-sm font-semibold text-brand-400">Day {stub.dayNumber}</p>
                {stub.title && <p className="mt-0.5 text-sm text-ig-text-secondary">{stub.title}</p>}
              </div>
              <span className="rounded-full bg-ig-border px-2.5 py-1 text-xs text-ig-text-tertiary">Purchase to unlock</span>
            </div>
          ))}

          {!displayPreview?.firstDay && (
            <div className="rounded-xl border border-ig-border bg-ig-elevated p-4 text-sm text-ig-text-secondary">
              Purchase this guide to see the full day-by-day itinerary with places, descriptions, and images.
            </div>
          )}
        </div>
      )}

      <div className="mt-10 space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-ig-text-primary">Traveler reviews</h2>
            <p className="mt-1 text-sm text-ig-text-tertiary">
              {reviewCount > 0 ? `${averageRating.toFixed(1)} avg • ${reviewCount} review${reviewCount === 1 ? '' : 's'}` : 'No reviews yet'}
            </p>
          </div>
          {reviewCount > 0 && <StarRating rating={averageRating} />}
        </div>

        {reviewSummary?.canReview && (
          <ReviewComposer
            title="Rate this guide"
            textLimit={reviewSummary.reviewTextLimit}
            initialRating={reviewSummary.myReview?.rating ?? 0}
            initialReviewText={reviewSummary.myReview?.reviewText ?? ''}
            submitLabel={reviewSummary.myReview ? 'Update review' : 'Publish review'}
            savingLabel={reviewSummary.myReview ? 'Updating...' : 'Publishing...'}
            onSubmit={handleReviewSubmit}
            onDelete={reviewSummary.myReview ? handleReviewDelete : undefined}
          />
        )}

        {!reviewSummary?.canReview && mode === 'preview' && (
          <div className="rounded-2xl border border-ig-border bg-ig-elevated p-4 text-sm text-ig-text-secondary">
            Purchase this guide to rate it and vote on reviews.
          </div>
        )}

        {reviewsError && (
          <div className="rounded-xl border border-ig-error/30 bg-ig-elevated p-4 text-sm text-ig-error">
            {reviewsError}
          </div>
        )}

        {reviewsLoading ? (
          <div className="text-sm text-ig-text-tertiary">Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <div className="rounded-xl border border-ig-border bg-ig-elevated p-4 text-sm text-ig-text-secondary">
            No traveler reviews yet.
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-2xl border border-ig-border bg-ig-elevated p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Avatar src={review.reviewerAvatarUrl} name={review.reviewerDisplayName} size="sm" />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-ig-text-primary">{review.reviewerDisplayName}</span>
                        {review.reviewerUsername && (
                          <span className="text-xs text-ig-text-tertiary">@{review.reviewerUsername}</span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <StarRating rating={review.rating} size="sm" />
                        <span className="text-xs text-ig-text-tertiary">
                          {new Date(review.updatedAt || review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                {review.reviewText && (
                  <div className="mt-3">
                    <ReviewText text={review.reviewText} />
                  </div>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                  <button
                    type="button"
                    disabled={!review.canVote}
                    onClick={() => handleVote(review.id, 'HELPFUL')}
                    className={`min-h-11 rounded-full border px-4 py-2 text-sm transition lg:min-h-9 lg:px-3 lg:py-1 lg:text-xs ${
                      review.viewerVote === 'HELPFUL'
                        ? 'border-brand-500/30 bg-brand-500/10 text-brand-500'
                        : 'border-ig-border text-ig-text-secondary'
                    } disabled:cursor-default disabled:opacity-60`}
                  >
                    Helpful {review.helpfulCount}
                  </button>
                  <button
                    type="button"
                    disabled={!review.canVote}
                    onClick={() => handleVote(review.id, 'NOT_HELPFUL')}
                    className={`min-h-11 rounded-full border px-4 py-2 text-sm transition lg:min-h-9 lg:px-3 lg:py-1 lg:text-xs ${
                      review.viewerVote === 'NOT_HELPFUL'
                        ? 'border-ig-error/30 bg-ig-error/10 text-ig-error'
                        : 'border-ig-border text-ig-text-secondary'
                    } disabled:cursor-default disabled:opacity-60`}
                  >
                    Not helpful {review.notHelpfulCount}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
