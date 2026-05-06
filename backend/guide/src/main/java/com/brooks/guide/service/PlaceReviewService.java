package com.brooks.guide.service;

import com.brooks.common.exception.BusinessException;
import com.brooks.common.exception.ResourceNotFoundException;
import com.brooks.guide.domain.GuidePurchaseStatus;
import com.brooks.guide.domain.PlaceReview;
import com.brooks.guide.dto.PlaceReviewListResponse;
import com.brooks.guide.dto.PlaceReviewRequest;
import com.brooks.guide.dto.PlaceReviewResponse;
import com.brooks.guide.repository.GuidePlaceRepository;
import com.brooks.guide.repository.GuidePurchaseRepository;
import com.brooks.guide.repository.PlaceReviewRepository;
import com.brooks.user.domain.User;
import com.brooks.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PlaceReviewService {

    private final PlaceReviewRepository reviewRepository;
    private final GuidePlaceRepository placeRepository;
    private final GuidePurchaseRepository purchaseRepository;
    private final UserService userService;
    private final ReviewModerationService reviewModerationService;
    private final ReviewAuthorViewResolver reviewAuthorViewResolver;

    @Transactional
    public PlaceReviewResponse upsertMyReview(String auth0Subject, UUID placeId, PlaceReviewRequest request) {
        User user = userService.findByAuth0Subject(auth0Subject);
        UUID guideId = resolveGuideIdForBuyer(placeId, user.getId());

        PlaceReview review = reviewRepository.findByPlaceIdAndUserId(placeId, user.getId()).orElse(null);
        String normalized = reviewModerationService.normalizeReviewText(request.getReviewText());
        if (review == null) {
            review = new PlaceReview(placeId, guideId, user.getId(), request.getRating(), normalized);
        } else {
            review.setRating(request.getRating());
            review.setReviewText(normalized);
        }
        review = reviewRepository.save(review);
        return toResponse(review, user.getId(), Map.of());
    }

    @Transactional
    public void deleteMyReview(String auth0Subject, UUID placeId) {
        User user = userService.findByAuth0Subject(auth0Subject);
        // Permission check: caller must own the parent guide.
        resolveGuideIdForBuyer(placeId, user.getId());
        PlaceReview review = reviewRepository.findByPlaceIdAndUserId(placeId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Place review", placeId));
        reviewRepository.delete(review);
    }

    @Transactional(readOnly = true)
    public PlaceReviewListResponse listReviews(String auth0Subject, UUID placeId) {
        User user = userService.findByAuth0Subject(auth0Subject);
        resolveGuideIdForBuyer(placeId, user.getId());

        List<PlaceReview> reviews = reviewRepository.findByPlaceIdOrderByCreatedAtDesc(placeId);
        Set<UUID> authorIds = reviews.stream().map(PlaceReview::getUserId).collect(Collectors.toCollection(HashSet::new));
        Map<UUID, ReviewAuthorViewResolver.ReviewAuthorView> authors = reviewAuthorViewResolver.resolve(authorIds);

        PlaceReviewResponse myReview = null;
        List<PlaceReviewResponse> others = new java.util.ArrayList<>();
        for (PlaceReview review : reviews) {
            PlaceReviewResponse response = toResponse(review, user.getId(), authors);
            if (review.getUserId().equals(user.getId())) {
                myReview = response;
            } else {
                others.add(response);
            }
        }

        return PlaceReviewListResponse.builder()
                .canReview(true)
                .reviewTextLimit(ReviewModerationService.REVIEW_TEXT_LIMIT)
                .myReview(myReview)
                .reviews(others)
                .build();
    }

    private UUID resolveGuideIdForBuyer(UUID placeId, UUID userId) {
        UUID guideId = placeRepository.findGuideIdByPlaceId(placeId)
                .orElseThrow(() -> new ResourceNotFoundException("Place", placeId));
        purchaseRepository
                .findFirstByBuyerIdAndGuideIdAndStatusOrderByCreatedAtDesc(userId, guideId, GuidePurchaseStatus.COMPLETED)
                .orElseThrow(() -> new BusinessException("You can review or read place reviews only after purchasing this guide"));
        return guideId;
    }

    private PlaceReviewResponse toResponse(PlaceReview review, UUID viewerId, Map<UUID, ReviewAuthorViewResolver.ReviewAuthorView> authors) {
        ReviewAuthorViewResolver.ReviewAuthorView author = authors.get(review.getUserId());
        return PlaceReviewResponse.builder()
                .id(review.getId())
                .placeId(review.getPlaceId())
                .guideId(review.getGuideId())
                .reviewerUserId(review.getUserId())
                .reviewerDisplayName(author != null ? author.getDisplayName() : "Traveler")
                .reviewerAvatarUrl(author != null ? author.getAvatarUrl() : null)
                .rating(review.getRating())
                .reviewText(review.getReviewText())
                .createdAt(review.getCreatedAt())
                .updatedAt(review.getUpdatedAt())
                .ownedByViewer(viewerId != null && viewerId.equals(review.getUserId()))
                .build();
    }
}
