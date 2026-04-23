'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import FollowButton from '@/components/ui/FollowButton';
import ReviewComposer from '@/components/reviews/ReviewComposer';
import ReviewText from '@/components/reviews/ReviewText';
import StarRating from '@/components/reviews/StarRating';
import { api } from '@/lib/api';
import { useAccessToken } from '@/hooks/useAccessToken';
import type { CreatorReviewItem, CreatorReviewListResponse, GuideListItem, PageResponse, Profile } from '@/types';

type Tab = 'guides' | 'reviews' | 'about';

export default function CreatorProfilePage({ params }: { params: { username: string } }) {
  const { token } = useAccessToken();
  const [activeTab, setActiveTab] = useState<Tab>('guides');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guides, setGuides] = useState<GuideListItem[]>([]);
  const [guidesLoading, setGuidesLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [reviewSummary, setReviewSummary] = useState<CreatorReviewListResponse | null>(null);
  const [reviews, setReviews] = useState<CreatorReviewItem[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInitRef = useRef(false);

  useEffect(() => {
    api.get<Profile>(`/api/creators/${params.username}`)
      .then((profileResponse) => {
        setProfile(profileResponse);
        return api.get<PageResponse<GuideListItem>>(`/api/creators/${params.username}/guides`);
      })
      .then((response) => setGuides(response.content))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load creator profile'))
      .finally(() => setGuidesLoading(false));
  }, [params.username]);

  useEffect(() => {
    if (!token || !profile) return;
    api.get<Profile>('/api/me', token)
      .then((me) => {
        if (me.username !== params.username) return null;
        setIsOwnProfile(true);
        return api.get<PageResponse<GuideListItem>>('/api/me/guides', token);
      })
      .then((response) => {
        if (response) {
          setGuides(response.content);
        }
      })
      .catch(() => {});
  }, [params.username, profile, token]);

  useEffect(() => {
    setReviewsLoading(true);
    setReviewsError(null);
    api.get<CreatorReviewListResponse>(`/api/creators/${params.username}/reviews`, token || undefined)
      .then((response) => {
        setReviewSummary(response);
        setReviews(response.reviews.content);
      })
      .catch((err) => setReviewsError(err instanceof Error ? err.message : 'Failed to load creator reviews'))
      .finally(() => setReviewsLoading(false));
  }, [params.username, token]);

  useEffect(() => {
    if (activeTab !== 'about' || !profile?.latitude || !profile?.longitude || mapInitRef.current) return;
    mapInitRef.current = true;
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_PUBLIC_TOKEN;
    if (!mapboxToken || !mapContainerRef.current) return;

    import('mapbox-gl').then(({ default: mapboxgl }) => {
      if (!mapContainerRef.current) return;
      mapboxgl.accessToken = mapboxToken;
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: process.env.NEXT_PUBLIC_MAPBOX_STYLE ?? 'mapbox://styles/mapbox/dark-v11',
        center: [profile.longitude!, profile.latitude!],
        zoom: 10,
        interactive: false,
      });
      new mapboxgl.Marker().setLngLat([profile.longitude!, profile.latitude!]).addTo(map);
    }).catch(() => {});
  }, [activeTab, profile]);

  const reloadReviews = async () => {
    const response = await api.get<CreatorReviewListResponse>(`/api/creators/${params.username}/reviews`, token || undefined);
    setReviewSummary(response);
    setReviews(response.reviews.content);
    setReviewsError(null);
  };

  const handleReviewSubmit = async (payload: { rating: number; reviewText: string | null }) => {
    if (!token) {
      throw new Error('Sign in to review this creator');
    }
    await api.post(`/api/creators/${params.username}/reviews/me`, payload, token);
    await reloadReviews();
  };

  const handleReviewDelete = async () => {
    if (!token) {
      throw new Error('Sign in to delete your review');
    }
    await api.delete(`/api/creators/${params.username}/reviews/me`, token);
    await reloadReviews();
  };

  const handleVote = async (reviewId: string, vote: 'HELPFUL' | 'NOT_HELPFUL') => {
    if (!token) {
      throw new Error('Sign in to vote on reviews');
    }
    await api.post(`/api/creators/${params.username}/reviews/${reviewId}/vote`, { vote }, token);
    await reloadReviews();
  };

  const handleDragStart = (id: string) => setDraggedId(id);

  const handleDrop = useCallback(async (targetId: string) => {
    if (!draggedId || draggedId === targetId || !token) return;
    const from = guides.findIndex((guide) => guide.id === draggedId);
    const to = guides.findIndex((guide) => guide.id === targetId);
    if (from === -1 || to === -1) return;

    const reordered = [...guides];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    setGuides(reordered);
    setDraggedId(null);

    await Promise.all(
      reordered.map((guide, index) =>
        api.patch(`/api/guides/${guide.id}`, { sortOrder: index }, token).catch(() => {})
      )
    );
  }, [draggedId, guides, token]);

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-sm text-ig-error">{error}</p>
      </div>
    );
  }

  if (!profile) {
    return <div className="mx-auto max-w-2xl px-4 py-12 text-center text-ig-text-tertiary">Loading...</div>;
  }

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-start gap-4">
        <Avatar src={profile.avatarUrl} name={profile.displayName ?? profile.username ?? ''} size="xl" verified={profile.verified} />
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h1 className="text-xl font-bold text-ig-text-primary">{profile.displayName ?? profile.username}</h1>
            {profile.verified && (
              <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-xs font-medium text-brand-500">
                Verified
              </span>
            )}
          </div>
          {profile.username && <p className="mb-3 text-sm text-ig-text-tertiary">@{profile.username}</p>}

          <div className="mb-3 flex gap-6">
            <div className="text-center">
              <div className="font-semibold text-ig-text-primary">{profile.guideCount}</div>
              <div className="text-xs text-ig-text-tertiary">Guides</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-ig-text-primary">{profile.followerCount}</div>
              <div className="text-xs text-ig-text-tertiary">Followers</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-ig-text-primary">{profile.followingCount}</div>
              <div className="text-xs text-ig-text-tertiary">Following</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {profile.creatorReviewCount > 0 ? (
              <div className="flex items-center gap-2">
                <StarRating rating={profile.creatorRatingAverage} size="sm" />
                <span className="text-sm text-ig-text-tertiary">
                  {profile.creatorRatingAverage.toFixed(1)} ({profile.creatorReviewCount})
                </span>
              </div>
            ) : (
              <span className="text-sm text-ig-text-tertiary">No creator reviews yet</span>
            )}
            {!isOwnProfile && <FollowButton userId={profile.userId} />}
            {isOwnProfile && (
              <Link
                href="/guides"
                className="inline-block rounded-md border border-ig-border px-4 py-1.5 text-sm font-medium text-ig-text-primary transition-colors hover:bg-ig-secondary"
              >
                Manage guides
              </Link>
            )}
          </div>
        </div>
      </div>

      {profile.bio && <p className="mb-4 text-ig-text-secondary">{profile.bio}</p>}
      {profile.region && <p className="mb-6 text-sm text-ig-text-tertiary">Based in {profile.region}</p>}

      <div className="mb-6 flex border-b border-ig-border">
        {(['guides', 'reviews', 'about'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`border-b-2 px-4 py-2 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'border-brand-500 text-brand-500'
                : 'border-transparent text-ig-text-tertiary hover:text-ig-text-primary'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'guides' && (
        guidesLoading ? (
          <div className="py-8 text-center text-sm text-ig-text-tertiary">Loading guides...</div>
        ) : guides.length === 0 ? (
          <div className="py-12 text-center">
            <p className="mb-2 text-ig-text-secondary">No guides yet</p>
            {isOwnProfile && (
              <Link href="/guides/new" className="text-sm text-brand-500 hover:underline">
                Create your first guide →
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {guides.map((guide) => (
              <div
                key={guide.id}
                draggable={isOwnProfile}
                onDragStart={isOwnProfile ? () => handleDragStart(guide.id) : undefined}
                onDragOver={isOwnProfile ? (event) => event.preventDefault() : undefined}
                onDrop={isOwnProfile ? () => handleDrop(guide.id) : undefined}
                className={`relative overflow-hidden rounded-lg border border-ig-border bg-ig-elevated transition-colors ${
                  draggedId === guide.id ? 'opacity-50' : ''
                } ${isOwnProfile ? 'cursor-grab' : ''}`}
              >
                {guide.status !== 'PUBLISHED' && (
                  <span className="absolute left-2 top-2 z-10 rounded bg-amber-500/90 px-1.5 py-0.5 text-xs font-semibold text-white">
                    {guide.status === 'DRAFT' ? 'Draft' : guide.status}
                  </span>
                )}
                {isOwnProfile && (
                  <span className="absolute right-2 top-2 z-10 select-none text-lg text-white/70">⠿</span>
                )}

                {guide.coverImageUrl ? (
                  <div className="h-36 bg-ig-secondary">
                    <img src={guide.coverImageUrl} alt="" className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="flex h-36 items-center justify-center bg-ig-secondary">
                    <span className="text-3xl text-ig-text-tertiary">🗺️</span>
                  </div>
                )}

                <div className="p-3">
                  <h3 className="mb-1 truncate text-sm font-semibold text-ig-text-primary">{guide.title}</h3>
                  <div className="mb-3 flex items-center gap-3 text-xs text-ig-text-tertiary">
                    {guide.region && <span>{guide.region}</span>}
                    <span>{guide.dayCount} days</span>
                    <span>{guide.placeCount} places</span>
                  </div>
                  <Link
                    href={`/guides/${guide.id}/view`}
                    className={`inline-flex w-full items-center justify-center rounded-md py-1.5 text-xs font-semibold transition-colors ${
                      guide.priceCents > 0
                        ? 'bg-brand-500 text-white hover:bg-brand-600'
                        : 'border border-ig-border text-ig-text-primary hover:bg-ig-secondary'
                    }`}
                  >
                    {guide.priceCents > 0 ? `Buy · ${formatPrice(guide.priceCents)}` : 'View'}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === 'reviews' && (
        <div className="space-y-4">
          {reviewSummary?.canReview && (
            <ReviewComposer
              title="Rate this creator's guides"
              textLimit={reviewSummary.reviewTextLimit}
              initialRating={reviewSummary.myReview?.rating ?? 0}
              initialReviewText={reviewSummary.myReview?.reviewText ?? ''}
              submitLabel={reviewSummary.myReview ? 'Update review' : 'Publish review'}
              savingLabel={reviewSummary.myReview ? 'Updating...' : 'Publishing...'}
              onSubmit={handleReviewSubmit}
              onDelete={reviewSummary.myReview ? handleReviewDelete : undefined}
            />
          )}

          {!reviewSummary?.canReview && (
            <div className="rounded-2xl border border-ig-border bg-ig-elevated p-4 text-sm text-ig-text-secondary">
              Purchase a guide from this creator to leave a review.
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
              No creator reviews yet.
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div key={review.id} className="rounded-2xl border border-ig-border bg-ig-elevated p-4">
                  <div className="flex items-start gap-3">
                    <Avatar src={review.reviewerAvatarUrl} name={review.reviewerDisplayName} size="sm" />
                    <div className="min-w-0 flex-1">
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
                      {review.reviewText && (
                        <div className="mt-3">
                          <ReviewText text={review.reviewText} />
                        </div>
                      )}
                      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                        <button
                          type="button"
                          disabled={!review.canVote}
                          onClick={() => handleVote(review.id, 'HELPFUL').catch((err) => alert(err instanceof Error ? err.message : 'Failed to vote'))}
                          className={`rounded-full border px-3 py-1 transition ${
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
                          onClick={() => handleVote(review.id, 'NOT_HELPFUL').catch((err) => alert(err instanceof Error ? err.message : 'Failed to vote'))}
                          className={`rounded-full border px-3 py-1 transition ${
                            review.viewerVote === 'NOT_HELPFUL'
                              ? 'border-ig-error/30 bg-ig-error/10 text-ig-error'
                              : 'border-ig-border text-ig-text-secondary'
                          } disabled:cursor-default disabled:opacity-60`}
                        >
                          Not helpful {review.notHelpfulCount}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'about' && (
        <div className="space-y-6">
          {profile.bio ? (
            <p className="text-ig-text-secondary">{profile.bio}</p>
          ) : (
            <p className="italic text-ig-text-tertiary">No bio yet.</p>
          )}
          {profile.region && (
            <div>
              <h3 className="mb-1 text-sm font-medium text-ig-text-primary">Region</h3>
              <p className="text-ig-text-secondary">{profile.region}</p>
            </div>
          )}
          {profile.latitude && profile.longitude && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-ig-text-primary">Location</h3>
              <div
                ref={mapContainerRef}
                className="w-full overflow-hidden rounded-xl border border-ig-border"
                style={{ height: 200 }}
              />
              {profile.region && <p className="mt-1 text-xs text-ig-text-tertiary">{profile.region}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
