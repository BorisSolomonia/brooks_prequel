export interface User {
  id: string;
  email: string;
  username: string | null;
  role: 'USER' | 'VERIFIED_CREATOR' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  onboardingCompleted: boolean;
  createdAt: string;
}

export interface Profile {
  userId: string;
  email: string;
  username: string | null;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  region: string | null;
  interests: string | null;
  latitude: number | null;
  longitude: number | null;
  role: string;
  followerCount: number;
  followingCount: number;
  guideCount: number;
  verified: boolean;
  creatorRatingAverage: number;
  creatorReviewCount: number;
  onboardingCompleted: boolean;
}

export interface ProfileUpdateRequest {
  displayName?: string;
  username?: string;
  bio?: string;
  avatarUrl?: string;
  region?: string;
  interests?: string;
  latitude?: number;
  longitude?: number;
}

export interface InfluencerMapPin {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  region: string | null;
  latitude: number;
  longitude: number;
  followerCount: number;
  guideCount: number;
  guideId: string | null;
  guideTitle: string | null;
  guidePrimaryCity: string | null;
  guideCountry: string | null;
  guidePriceCents: number | null;
  guideDayCount: number | null;
  guidePlaceCount: number | null;
  verified: boolean;
  creatorRatingAverage: number;
  rank: number;
}

export interface InfluencerMapResponse {
  pins: InfluencerMapPin[];
}

export interface FollowResponse {
  following: boolean;
  followerCount: number;
  followingCount: number;
}

export interface Story {
  id: string;
  creatorId: string;
  creatorUsername: string;
  creatorAvatarUrl: string | null;
  guideId: string;
  guideTitle: string;
  guideRegion: string | null;
  guidePrimaryCity: string | null;
  imageUrl: string;
  promotionText: string | null;
  expiresAt: string;
  viewCount: number;
  createdAt: string;
}

export interface CreatorStoryStrip {
  creatorId: string;
  creatorUsername: string;
  creatorAvatarUrl: string | null;
  hasActiveStories: boolean;
  stories: Story[];
}

export interface FeedItem {
  id: string;
  type: 'story' | 'guide';
  creatorId: string;
  creatorUsername: string;
  creatorDisplayName: string;
  creatorAvatarUrl: string | null;
  title: string | null;
  imageUrl: string | null;
  caption: string | null;
  createdAt: string;
}

// ── Guide Types ─────────────────────────────────────────────

export type GuideStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'DELETED';

export interface GuidePlaceImage {
  id: string;
  imageUrl: string;
  caption: string | null;
  position: number;
}

export interface GuidePlace {
  id: string;
  position: number;
  name: string;
  description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  googlePlaceId: string | null;
  category: string | null;
  priceLevel: number | null;
  suggestedStartMinute: number | null;
  suggestedDurationMinutes: number | null;
  sponsored: boolean;
  images: GuidePlaceImage[];
}

export interface GuideBlock {
  id: string;
  position: number;
  title: string | null;
  description: string | null;
  blockType: string;
  blockCategory: string;
  suggestedStartMinute: number | null;
  places: GuidePlace[];
}

export interface GuideDay {
  id: string;
  dayNumber: number;
  title: string | null;
  description: string | null;
  blocks: GuideBlock[];
}

export interface Guide {
  id: string;
  creatorId: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  region: string | null;
  primaryCity: string | null;
  country: string | null;
  timezone: string | null;
  priceCents: number;
  salePriceCents?: number | null;
  saleEndsAt?: string | null;
  effectivePriceCents?: number;
  currency: string;
  status: GuideStatus;
  versionNumber: number;
  dayCount: number;
  placeCount: number;
  displayLocation?: string | null;
  spotCount?: number;
  averageRating?: number;
  reviewCount?: number;
  weeklyPopularityScore?: number;
  popularThisWeek?: boolean;
  tags: string[];
  days: GuideDay[];
  createdAt: string;
  updatedAt: string;
  travelerStage?: string | null;
  personas?: string[];
  bestSeasonStartMonth?: number | null;
  bestSeasonEndMonth?: number | null;
  bestSeasonLabel?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface GuidePreviewPlace {
  name: string;
  address: string | null;
  category: string | null;
  priceLevel: number | null;
  suggestedStartMinute: number | null;
  suggestedDurationMinutes: number | null;
  latitude: number | null;
  longitude: number | null;
}

export interface GuidePreviewBlock {
  title: string | null;
  description: string | null;
  blockType: string | null;
  suggestedStartMinute: number | null;
  places: GuidePreviewPlace[];
}

export interface GuidePreviewDay {
  dayNumber: number;
  title: string | null;
  description: string | null;
  blocks: GuidePreviewBlock[];
}

export interface GuideLockedDayStub {
  dayNumber: number;
  title: string | null;
}

export interface GuideReviewItem {
  id: string;
  guideId: string;
  reviewerUserId: string;
  reviewerUsername: string | null;
  reviewerDisplayName: string;
  reviewerAvatarUrl: string | null;
  rating: number;
  reviewText: string | null;
  createdAt: string;
  updatedAt: string;
  helpfulCount: number;
  notHelpfulCount: number;
  viewerVote: 'HELPFUL' | 'NOT_HELPFUL' | null;
  ownedByViewer: boolean;
  canVote: boolean;
}

export interface GuideReviewListResponse {
  averageRating: number;
  reviewCount: number;
  canReview: boolean;
  reviewTextLimit: number;
  myReview: GuideReviewItem | null;
  reviews: PageResponse<GuideReviewItem>;
}

export interface CreatorReviewItem {
  id: string;
  creatorId: string;
  reviewerUserId: string;
  reviewerUsername: string | null;
  reviewerDisplayName: string;
  reviewerAvatarUrl: string | null;
  rating: number;
  reviewText: string | null;
  createdAt: string;
  updatedAt: string;
  helpfulCount: number;
  notHelpfulCount: number;
  viewerVote: 'HELPFUL' | 'NOT_HELPFUL' | null;
  ownedByViewer: boolean;
  canVote: boolean;
}

export interface CreatorReviewListResponse {
  averageRating: number;
  reviewCount: number;
  canReview: boolean;
  reviewTextLimit: number;
  myReview: CreatorReviewItem | null;
  reviews: PageResponse<CreatorReviewItem>;
}

export interface GuidePreview {
  id: string;
  title: string;
  coverImageUrl: string | null;
  dayCount: number;
  placeCount: number;
  priceCents: number;
  currency: string;
  creatorId: string;
  salePriceCents?: number | null;
  saleEndsAt?: string | null;
  effectivePriceCents?: number;
  region?: string | null;
  primaryCity?: string | null;
  displayLocation?: string | null;
  spotCount?: number;
  creatorUsername?: string | null;
  purchaseCount?: number;
  averageRating?: number;
  reviewCount?: number;
  weeklyPopularityScore?: number;
  popularThisWeek?: boolean;
  bestSeasonStartMonth?: number | null;
  bestSeasonEndMonth?: number | null;
  bestSeasonLabel?: string | null;
  firstDay?: GuidePreviewDay | null;
  lockedDays?: GuideLockedDayStub[];
  recentReviews?: GuideReviewPreview[];
}

export interface GuideReviewPreview {
  rating: number;
  reviewText: string | null;
  createdAt: string;
}

export interface GuideSaveStatusResponse {
  saved: boolean;
}

export interface GuideListItem {
  id: string;
  title: string;
  coverImageUrl: string | null;
  region: string | null;
  status: GuideStatus;
  dayCount: number;
  placeCount: number;
  priceCents: number;
  salePriceCents?: number | null;
  saleEndsAt?: string | null;
  effectivePriceCents?: number;
  currency: string;
  versionNumber: number;
  displayLocation?: string | null;
  spotCount?: number;
  averageRating?: number;
  reviewCount?: number;
  weeklyPopularityScore?: number;
  popularThisWeek?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GuideLibraryItem {
  id: string;
  title: string;
  coverImageUrl: string | null;
  region: string | null;
  dayCount: number;
  placeCount: number;
  priceCents: number;
  salePriceCents?: number | null;
  saleEndsAt?: string | null;
  effectivePriceCents?: number;
  currency: string;
  versionNumber: number | null;
  creatorUsername: string | null;
  displayLocation?: string | null;
  spotCount?: number;
  averageRating?: number;
  reviewCount?: number;
  weeklyPopularityScore?: number;
  popularThisWeek?: boolean;
  savedByViewer?: boolean;
  savedAt: string | null;
  purchasedAt: string | null;
}

export interface GuideLibraryResponse {
  created: GuideLibraryItem[];
  saved: GuideLibraryItem[];
  purchased: GuideLibraryItem[];
}

export interface GuideCreateRequest {
  title: string;
  description?: string;
  coverImageUrl?: string;
  region?: string;
  primaryCity?: string;
  country?: string;
  timezone?: string;
  priceCents?: number;
  currency?: string;
  tags?: string[];
}

export interface GuideUpdateRequest {
  title?: string;
  description?: string;
  coverImageUrl?: string;
  region?: string;
  primaryCity?: string;
  country?: string;
  timezone?: string;
  priceCents?: number;
  salePriceCents?: number | null;
  saleEndsAt?: string | null;
  currency?: string;
  tags?: string[];
  bestSeasonStartMonth?: number | null;
  bestSeasonEndMonth?: number | null;
  bestSeasonLabel?: string | null;
  travelerStage?: string | null;
  personas?: string[];
  latitude?: number | null;
  longitude?: number | null;
}

export interface GuideDayRequest {
  title?: string;
  description?: string;
}

export interface GuideBlockRequest {
  title?: string;
  description?: string;
  blockType?: string;
  blockCategory?: string;
  suggestedStartMinute?: number;
}

export interface GuidePlaceRequest {
  name: string;
  description?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  googlePlaceId?: string;
  category?: string;
  priceLevel?: number;
  suggestedStartMinute?: number;
  suggestedDurationMinutes?: number;
  sponsored?: boolean;
  imageUrls?: string[];
}

export interface FollowerSummary {
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface GuideCheckoutSessionResponse {
  provider: string;
  checkoutUrl: string | null;
  alreadyOwned: boolean;
  tripId: string | null;
}

export interface MyTripSummary {
  id: string;
  guideId: string;
  guideVersionId: string;
  guideVersionNumber: number;
  title: string;
  coverImageUrl: string | null;
  region: string | null;
  primaryCity: string | null;
  country: string | null;
  timezone: string | null;
  dayCount: number;
  placeCount: number;
  amountCents: number;
  currency: string;
  purchasedAt: string;
  tripStartDate: string | null;
  tripEndDate: string | null;
}

export interface MyTripItem {
  id: string;
  placeId: string;
  dayNumber: number;
  blockPosition: number;
  placePosition: number;
  blockTitle: string | null;
  blockCategory?: string;
  placeName: string;
  placeAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  suggestedStartMinute: number | null;
  suggestedDurationMinutes: number | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  skipped: boolean;
  visited: boolean;
  visitedAt: string | null;
}

export interface MyTripDetail {
  id: string;
  guideId: string;
  guideVersionId: string;
  guideVersionNumber: number;
  purchasedAt: string;
  tripStartDate: string | null;
  tripEndDate: string | null;
  tripTimezone: string | null;
  guide: Guide;
  items: MyTripItem[];
}

export interface MyTripsResponse {
  trips: MyTripSummary[];
}

export interface MyTripItemUpdateRequest {
  placeId: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  skipped: boolean;
}

export interface MyTripSetupRequest {
  tripStartDate?: string;
  tripTimezone?: string;
  items?: MyTripItemUpdateRequest[];
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

// ── Search & Rankings Types ─────────────────────────────────

export interface CreatorSearchResult {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  region: string | null;
  followerCount: number;
  guideCount: number;
  verified: boolean;
}

export interface GuideSearchResult {
  id: string;
  title: string;
  coverImageUrl: string | null;
  region: string | null;
  primaryCity: string | null;
  dayCount: number;
  placeCount: number;
  priceCents: number;
  salePriceCents?: number | null;
  effectivePriceCents?: number;
  currency: string;
  displayLocation?: string | null;
  spotCount?: number;
  averageRating?: number;
  reviewCount?: number;
  weeklyPopularityScore?: number;
  popularThisWeek?: boolean;
  creatorUsername: string;
  creatorDisplayName: string | null;
  purchaseCount?: number;
  bestSeasonStartMonth?: number | null;
  bestSeasonEndMonth?: number | null;
  bestSeasonLabel?: string | null;
}

export interface PlaceSearchResult {
  id: string;
  name: string;
  category: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  guideId: string;
  guideTitle: string;
  guideRegion: string | null;
}

export interface UnifiedSearchResponse {
  query: string;
  creators: CreatorSearchResult[];
  creatorsTotalCount: number;
  guides: GuideSearchResult[];
  guidesTotalCount: number;
  places: PlaceSearchResult[];
  placesTotalCount: number;
}

export interface RankedCreator {
  rank: number;
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  region: string | null;
  followerCount: number;
  guideCount: number;
  verified: boolean;
  score: number;
}

export interface RegionalRankingResponse {
  region: string;
  creators: RankedCreator[];
  total: number;
}

// ── Purchase Types ──────────────────────────────────────────

export interface CheckoutResponse {
  checkoutUrl: string;
  sessionId: string;
}

export interface PurchaseResponse {
  id: string;
  guideId: string;
  guideVersionNumber: number;
  priceCentsPaid: number;
  currency: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  guideTitle: string | null;
  guideCoverImageUrl: string | null;
  guideRegion: string | null;
}

export type AiProvider = 'OPENAI' | 'GEMINI' | 'ANTHROPIC';

export interface AiKeyResponse {
  provider: AiProvider;
  keyHint: string;
  selectedModel: string | null;
  updatedAt: string;
}
