'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReviewComposer from './ReviewComposer';
import { api } from '@/lib/api';

interface PlaceReviewResponse {
  id: string;
  placeId: string;
  guideId: string;
  reviewerUserId: string;
  reviewerDisplayName: string | null;
  reviewerAvatarUrl: string | null;
  rating: number;
  reviewText: string | null;
  createdAt: string;
  updatedAt: string;
  ownedByViewer: boolean;
}

interface PlaceReviewListResponse {
  canReview: boolean;
  reviewTextLimit: number;
  myReview: PlaceReviewResponse | null;
  reviews: PlaceReviewResponse[];
}

interface Props {
  placeId: string;
  placeName: string;
  token: string | null;
}

export default function PlaceReviewPanel({ placeId, placeName, token }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [data, setData] = useState<PlaceReviewListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<PlaceReviewListResponse>(`/api/me/places/${placeId}/reviews`, token);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('widgets.reviews.failedLoadReviews'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && !data && token) {
      fetchReviews();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, token]);

  const handleSubmit = async (payload: { rating: number; reviewText: string | null }) => {
    if (!token) return;
    await api.post<PlaceReviewResponse>(`/api/me/places/${placeId}/review`, payload, token);
    setShowComposer(false);
    await fetchReviews();
  };

  const handleDelete = async () => {
    if (!token) return;
    await api.delete(`/api/me/places/${placeId}/review`, token);
    setShowComposer(false);
    await fetchReviews();
  };

  return (
    <div className="mt-3 border-t border-ig-border pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-semibold uppercase tracking-wide text-brand-500 hover:text-brand-400"
      >
        {open ? t('widgets.reviews.hideReviews') : t('widgets.reviews.placeReviews')}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {loading && <p className="text-xs text-ig-text-tertiary">{t('widgets.reviews.loadingReviews')}</p>}
          {error && <p className="text-xs text-ig-error">{error}</p>}

          {data && (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-ig-text-tertiary">
                  {t('widgets.reviews.reviewCount', { count: data.reviews.length + (data.myReview ? 1 : 0) })}
                </p>
                {!showComposer && (
                  <button
                    type="button"
                    onClick={() => setShowComposer(true)}
                    className="text-xs font-semibold text-brand-500 hover:text-brand-400"
                  >
                    {data.myReview ? t('widgets.reviews.editYours') : t('widgets.reviews.addYours')}
                  </button>
                )}
              </div>

              {showComposer && (
                <ReviewComposer
                  title={t('widgets.reviews.yourReviewOf', { placeName })}
                  textLimit={data.reviewTextLimit}
                  initialRating={data.myReview?.rating ?? 0}
                  initialReviewText={data.myReview?.reviewText ?? ''}
                  submitLabel={t('widgets.reviews.saveReview')}
                  savingLabel={t('widgets.reviews.saving')}
                  onSubmit={handleSubmit}
                  onDelete={data.myReview ? handleDelete : undefined}
                />
              )}

              {data.myReview && !showComposer && (
                <div className="rounded-lg border border-brand-500/30 bg-brand-500/5 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-brand-500">{t('widgets.reviews.yourReview')}</p>
                    <p className="text-xs text-ig-text-tertiary">{'★'.repeat(data.myReview.rating)}{'☆'.repeat(5 - data.myReview.rating)}</p>
                  </div>
                  {data.myReview.reviewText && <p className="mt-1 text-xs text-ig-text-secondary">{data.myReview.reviewText}</p>}
                </div>
              )}

              {data.reviews.length > 0 && (
                <div className="space-y-2">
                  {data.reviews.map((review) => (
                    <div key={review.id} className="rounded-lg border border-ig-border bg-ig-primary p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-ig-text-primary">{review.reviewerDisplayName || t('widgets.reviews.traveler')}</p>
                        <p className="text-xs text-ig-text-tertiary">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</p>
                      </div>
                      {review.reviewText && <p className="mt-1 text-xs text-ig-text-secondary">{review.reviewText}</p>}
                    </div>
                  ))}
                </div>
              )}

              {data.reviews.length === 0 && !data.myReview && (
                <p className="text-xs text-ig-text-tertiary">{t('widgets.reviews.noReviewsYet')}</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
