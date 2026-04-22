package com.brooks.guide.service;

import com.brooks.common.dto.PageResponse;
import com.brooks.common.exception.BusinessException;
import com.brooks.common.exception.ResourceNotFoundException;
import com.brooks.guide.domain.GuidePurchase;
import com.brooks.guide.domain.GuidePurchaseStatus;
import com.brooks.guide.domain.GuideReview;
import com.brooks.guide.domain.GuideReviewVote;
import com.brooks.guide.domain.ReviewVoteValue;
import com.brooks.guide.dto.GuideReviewListResponse;
import com.brooks.guide.dto.GuideReviewRequest;
import com.brooks.guide.dto.GuideReviewResponse;
import com.brooks.guide.dto.ReviewVoteRequest;
import com.brooks.guide.repository.GuidePurchaseRepository;
import com.brooks.guide.repository.GuideRepository;
import com.brooks.guide.repository.GuideReviewRepository;
import com.brooks.guide.repository.GuideReviewVoteRepository;
import com.brooks.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GuideReviewService {

    private final GuideReviewRepository reviewRepository;
    private final GuideReviewVoteRepository guideReviewVoteRepository;
    private final GuidePurchaseRepository purchaseRepository;
    private final GuideRepository guideRepository;
    private final UserService userService;
    private final ReviewModerationService reviewModerationService;
    private final ReviewAuthorViewResolver reviewAuthorViewResolver;

    @Transactional
    public GuideReviewResponse submitReview(String auth0Subject, UUID tripId, GuideReviewRequest request) {
        var user = userService.findByAuth0Subject(auth0Subject);
        GuidePurchase purchase = purchaseRepository.findByIdAndBuyerId(tripId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Trip", tripId));
        ensureCompletedPurchase(purchase);
        return upsertReviewForPurchase(user.getId(), purchase, request);
    }

    @Transactional
    public GuideReviewResponse upsertMyReview(String auth0Subject, UUID guideId, GuideReviewRequest request) {
        var user = userService.findByAuth0Subject(auth0Subject);
        GuidePurchase purchase = purchaseRepository
                .findFirstByBuyerIdAndGuideIdAndStatusOrderByCreatedAtDesc(user.getId(), guideId, GuidePurchaseStatus.COMPLETED)
                .orElseThrow(() -> new BusinessException("You can review this guide only after purchase"));
        return upsertReviewForPurchase(user.getId(), purchase, request);
    }

    @Transactional
    public void deleteMyReview(String auth0Subject, UUID guideId) {
        var user = userService.findByAuth0Subject(auth0Subject);
        GuideReview review = reviewRepository.findByGuideIdAndBuyerId(guideId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Guide review", guideId));
        guideReviewVoteRepository.deleteByGuideReviewId(review.getId());
        reviewRepository.delete(review);
    }

    @Transactional(readOnly = true)
    public GuideReviewListResponse getReviews(UUID guideId, String auth0Subject, int page, int size) {
        var viewer = auth0Subject != null ? userService.findByAuth0Subject(auth0Subject) : null;
        Page<GuideReview> result = reviewRepository.findByGuideIdOrderByCreatedAtDesc(guideId, PageRequest.of(page, size));

        Map<UUID, ReviewVoteValue> viewerVotes = Map.of();
        if (viewer != null && !result.getContent().isEmpty()) {
            List<UUID> reviewIds = result.getContent().stream().map(GuideReview::getId).toList();
            viewerVotes = guideReviewVoteRepository.findByGuideReviewIdIn(reviewIds).stream()
                    .filter(vote -> vote.getVoterId().equals(viewer.getId()))
                    .collect(Collectors.toMap(GuideReviewVote::getGuideReviewId, GuideReviewVote::getVoteValue));
        }
        final Map<UUID, ReviewVoteValue> resolvedViewerVotes = viewerVotes;

        List<GuideReviewResponse> content = result.getContent().stream()
                .map(review -> toResponse(review, resolvedViewerVotes, viewer != null ? viewer.getId() : null,
                        canVoteOnGuideReview(guideId, viewer != null ? viewer.getId() : null, review)))
                .toList();

        GuideReviewResponse myReview = null;
        boolean canReview = false;
        if (viewer != null) {
            canReview = purchaseRepository.findFirstByBuyerIdAndGuideIdAndStatusOrderByCreatedAtDesc(
                    viewer.getId(), guideId, GuidePurchaseStatus.COMPLETED).isPresent();
            myReview = reviewRepository.findByGuideIdAndBuyerId(guideId, viewer.getId())
                    .map(review -> toResponse(review, resolvedViewerVotes, viewer.getId(), false))
                    .orElse(null);
        }

        return GuideReviewListResponse.builder()
                .averageRating(reviewRepository.averageRatingByGuideId(guideId))
                .reviewCount(reviewRepository.countByGuideId(guideId))
                .canReview(canReview)
                .reviewTextLimit(ReviewModerationService.REVIEW_TEXT_LIMIT)
                .myReview(myReview)
                .reviews(new PageResponse<>(content, result.getNumber(), result.getSize(),
                        result.getTotalElements(), result.getTotalPages(), result.isLast()))
                .build();
    }

    @Transactional
    public GuideReviewResponse vote(String auth0Subject, UUID guideId, UUID reviewId, ReviewVoteRequest request) {
        var voter = userService.findByAuth0Subject(auth0Subject);
        GuideReview review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Guide review", reviewId));
        if (!review.getGuideId().equals(guideId)) {
            throw new BusinessException("Review does not belong to this guide");
        }
        ensureVoteAllowed(guideId, voter.getId(), review.getBuyerId());

        GuideReviewVote vote = guideReviewVoteRepository.findByGuideReviewIdAndVoterId(reviewId, voter.getId())
                .orElseGet(() -> new GuideReviewVote(reviewId, voter.getId(), request.getVote()));
        ReviewVoteValue previous = vote.getId() != null ? vote.getVoteValue() : null;
        vote.setVoteValue(request.getVote());
        guideReviewVoteRepository.save(vote);

        if (previous != request.getVote()) {
            adjustVoteCounts(review, previous, request.getVote());
            review = reviewRepository.save(review);
        }

        return toResponse(review, Map.of(review.getId(), request.getVote()), voter.getId(), true);
    }

    private GuideReviewResponse upsertReviewForPurchase(UUID userId, GuidePurchase purchase, GuideReviewRequest request) {
        GuideReview review = reviewRepository.findByGuideIdAndBuyerId(purchase.getGuideId(), userId).orElse(null);
        if (review == null) {
            review = new GuideReview(
                    purchase.getGuideId(),
                    userId,
                    purchase.getId(),
                    request.getRating(),
                    reviewModerationService.normalizeReviewText(request.getReviewText())
            );
        } else {
            guideReviewVoteRepository.deleteByGuideReviewId(review.getId());
            review.setHelpfulCount(0);
            review.setNotHelpfulCount(0);
            review.setPurchaseId(purchase.getId());
            review.setRating(request.getRating());
            review.setReviewText(reviewModerationService.normalizeReviewText(request.getReviewText()));
        }
        review = reviewRepository.save(review);
        return toResponse(review, Map.of(), userId, false);
    }

    private void ensureCompletedPurchase(GuidePurchase purchase) {
        if (purchase.getStatus() != GuidePurchaseStatus.COMPLETED) {
            throw new BusinessException("Purchase not completed");
        }
    }

    private void ensureVoteAllowed(UUID guideId, UUID voterId, UUID reviewAuthorId) {
        if (!purchaseRepository.existsByBuyerIdAndStatus(voterId, GuidePurchaseStatus.COMPLETED)) {
            throw new BusinessException("Only travelers with completed purchases can vote on reviews");
        }
        if (voterId.equals(reviewAuthorId)) {
            throw new BusinessException("You cannot vote on your own review");
        }
        UUID creatorId = guideRepository.findById(guideId)
                .orElseThrow(() -> new ResourceNotFoundException("Guide", guideId))
                .getCreatorId();
        if (voterId.equals(creatorId)) {
            throw new BusinessException("Creators cannot vote on reviews about their own guides");
        }
    }

    private boolean canVoteOnGuideReview(UUID guideId, UUID viewerId, GuideReview review) {
        if (viewerId == null) {
            return false;
        }
        if (!purchaseRepository.existsByBuyerIdAndStatus(viewerId, GuidePurchaseStatus.COMPLETED)) {
            return false;
        }
        if (viewerId.equals(review.getBuyerId())) {
            return false;
        }
        UUID creatorId = guideRepository.findById(guideId)
                .orElseThrow(() -> new ResourceNotFoundException("Guide", guideId))
                .getCreatorId();
        return !viewerId.equals(creatorId);
    }

    private void adjustVoteCounts(GuideReview review, ReviewVoteValue previous, ReviewVoteValue next) {
        if (previous == ReviewVoteValue.HELPFUL) {
            review.setHelpfulCount(Math.max(0, review.getHelpfulCount() - 1));
        } else if (previous == ReviewVoteValue.NOT_HELPFUL) {
            review.setNotHelpfulCount(Math.max(0, review.getNotHelpfulCount() - 1));
        }

        if (next == ReviewVoteValue.HELPFUL) {
            review.setHelpfulCount(review.getHelpfulCount() + 1);
        } else if (next == ReviewVoteValue.NOT_HELPFUL) {
            review.setNotHelpfulCount(review.getNotHelpfulCount() + 1);
        }
    }

    private GuideReviewResponse toResponse(GuideReview review, Map<UUID, ReviewVoteValue> viewerVotes, UUID viewerId, boolean canVote) {
        var author = reviewAuthorViewResolver.resolve(List.of(review.getBuyerId())).get(review.getBuyerId());
        return GuideReviewResponse.builder()
                .id(review.getId())
                .guideId(review.getGuideId())
                .reviewerUserId(review.getBuyerId())
                .reviewerUsername(author != null ? author.getUsername() : null)
                .reviewerDisplayName(author != null ? author.getDisplayName() : "Traveler")
                .reviewerAvatarUrl(author != null ? author.getAvatarUrl() : null)
                .rating(review.getRating())
                .reviewText(review.getReviewText())
                .createdAt(review.getCreatedAt())
                .updatedAt(review.getUpdatedAt())
                .helpfulCount(review.getHelpfulCount())
                .notHelpfulCount(review.getNotHelpfulCount())
                .viewerVote(Optional.ofNullable(viewerVotes.get(review.getId())).map(Enum::name).orElse(null))
                .ownedByViewer(viewerId != null && viewerId.equals(review.getBuyerId()))
                .canVote(canVote)
                .build();
    }
}
