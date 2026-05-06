'use client';

import { useEffect, useState } from 'react';
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
      setError(err instanceof Error ? err.message : 'Failed to load reviews');
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
        {open ? '▾ Hide reviews' : '▸ Place reviews'}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {loading && <p className="text-xs text-ig-text-tertiary">Loading reviews...</p>}
          {error && <p className="text-xs text-ig-error">{error}</p>}

          {data && (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-ig-text-tertiary">
                  {data.reviews.length + (data.myReview ? 1 : 0)} review{(data.reviews.length + (data.myReview ? 1 : 0)) === 1 ? '' : 's'} from buyers of this guide
                </p>
                {!showComposer && (
                  <button
                    type="button"
                    onClick={() => setShowComposer(true)}
                    className="text-xs font-semibold text-brand-500 hover:text-brand-400"
                  >
                    {data.myReview ? 'Edit yours' : 'Add yours'}
                  </button>
                )}
              </div>

              {showComposer && (
                <ReviewComposer
                  title={`Your review of ${placeName}`}
                  textLimit={data.reviewTextLimit}
                  initialRating={data.myReview?.rating ?? 0}
                  initialReviewText={data.myReview?.reviewText ?? ''}
                  submitLabel="Save review"
                  savingLabel="Saving..."
                  onSubmit={handleSubmit}
                  onDelete={data.myReview ? handleDelete : undefined}
                />
              )}

              {data.myReview && !showComposer && (
                <div className="rounded-lg border border-brand-500/30 bg-brand-500/5 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-brand-500">Your review</p>
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
                        <p className="text-xs font-semibold text-ig-text-primary">{review.reviewerDisplayName || 'Traveler'}</p>
                        <p className="text-xs text-ig-text-tertiary">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</p>
                      </div>
                      {review.reviewText && <p className="mt-1 text-xs text-ig-text-secondary">{review.reviewText}</p>}
                    </div>
                  ))}
                </div>
              )}

              {data.reviews.length === 0 && !data.myReview && (
                <p className="text-xs text-ig-text-tertiary">No reviews yet. Be the first.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
