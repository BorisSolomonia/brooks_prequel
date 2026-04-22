package com.brooks.guide.service;

import com.brooks.common.dto.PageResponse;
import com.brooks.common.exception.BusinessException;
import com.brooks.common.exception.ResourceNotFoundException;
import com.brooks.guide.domain.CreatorReview;
import com.brooks.guide.domain.CreatorReviewVote;
import com.brooks.guide.domain.GuidePurchaseStatus;
import com.brooks.guide.domain.ReviewVoteValue;
import com.brooks.guide.dto.CreatorReviewListResponse;
import com.brooks.guide.dto.CreatorReviewRequest;
import com.brooks.guide.dto.CreatorReviewResponse;
import com.brooks.guide.dto.ReviewVoteRequest;
import com.brooks.guide.repository.CreatorReviewRepository;
import com.brooks.guide.repository.CreatorReviewVoteRepository;
import com.brooks.guide.repository.GuidePurchaseRepository;
import com.brooks.profile.repository.UserProfileRepository;
import com.brooks.user.domain.User;
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
public class CreatorReviewService {

    private final CreatorReviewRepository creatorReviewRepository;
    private final CreatorReviewVoteRepository creatorReviewVoteRepository;
    private final GuidePurchaseRepository guidePurchaseRepository;
    private final UserProfileRepository userProfileRepository;
    private final UserService userService;
    private final ReviewModerationService reviewModerationService;
    private final ReviewAuthorViewResolver reviewAuthorViewResolver;

    @Transactional
    public CreatorReviewResponse upsertMyReview(String auth0Subject, String username, CreatorReviewRequest request) {
        User reviewer = userService.findByAuth0Subject(auth0Subject);
        User creator = userService.findByUsername(username);
        ensureCreatorReviewAllowed(reviewer.getId(), creator.getId());

        CreatorReview review = creatorReviewRepository.findByCreatorIdAndReviewerId(creator.getId(), reviewer.getId())
                .orElseGet(() -> new CreatorReview(creator.getId(), reviewer.getId(), request.getRating(), null));

        boolean resetVotes = review.getId() != null;
        review.setRating(request.getRating());
        review.setReviewText(reviewModerationService.normalizeReviewText(request.getReviewText()));
        review = creatorReviewRepository.save(review);

        if (resetVotes) {
            creatorReviewVoteRepository.deleteByCreatorReviewId(review.getId());
            review.setHelpfulCount(0);
            review.setNotHelpfulCount(0);
            review = creatorReviewRepository.save(review);
        }

        refreshCreatorReviewSummary(creator.getId());
        return toResponse(review, Map.of(), reviewer.getId(), false);
    }

    @Transactional
    public void deleteMyReview(String auth0Subject, String username) {
        User reviewer = userService.findByAuth0Subject(auth0Subject);
        User creator = userService.findByUsername(username);
        CreatorReview review = creatorReviewRepository.findByCreatorIdAndReviewerId(creator.getId(), reviewer.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Creator review", creator.getId()));
        creatorReviewVoteRepository.deleteByCreatorReviewId(review.getId());
        creatorReviewRepository.delete(review);
        refreshCreatorReviewSummary(creator.getId());
    }

    @Transactional(readOnly = true)
    public CreatorReviewListResponse getReviews(String username, String auth0Subject, int page, int size) {
        User creator = userService.findByUsername(username);
        User viewer = auth0Subject != null ? userService.findByAuth0Subject(auth0Subject) : null;

        Page<CreatorReview> result = creatorReviewRepository.findByCreatorIdOrderByCreatedAtDesc(creator.getId(), PageRequest.of(page, size));

        Map<UUID, ReviewVoteValue> viewerVotes = Map.of();
        if (viewer != null && !result.getContent().isEmpty()) {
            List<UUID> reviewIds = result.getContent().stream().map(CreatorReview::getId).toList();
            viewerVotes = creatorReviewVoteRepository.findByCreatorReviewIdIn(reviewIds).stream()
                    .filter(vote -> vote.getVoterId().equals(viewer.getId()))
                    .collect(Collectors.toMap(CreatorReviewVote::getCreatorReviewId, CreatorReviewVote::getVoteValue));
        }
        final Map<UUID, ReviewVoteValue> resolvedViewerVotes = viewerVotes;

        List<CreatorReviewResponse> content = result.getContent().stream()
                .map(review -> toResponse(review, resolvedViewerVotes, viewer != null ? viewer.getId() : null,
                        canVoteOnCreatorReview(viewer, creator.getId(), review)))
                .toList();

        CreatorReviewResponse myReview = null;
        boolean canReview = false;
        if (viewer != null) {
            canReview = canReviewCreator(viewer.getId(), creator.getId());
            myReview = creatorReviewRepository.findByCreatorIdAndReviewerId(creator.getId(), viewer.getId())
                    .map(review -> toResponse(review, resolvedViewerVotes, viewer.getId(), false))
                    .orElse(null);
        }

        return CreatorReviewListResponse.builder()
                .averageRating(creatorReviewRepository.averageRatingByCreatorId(creator.getId()))
                .reviewCount(creatorReviewRepository.countByCreatorId(creator.getId()))
                .canReview(canReview)
                .reviewTextLimit(ReviewModerationService.REVIEW_TEXT_LIMIT)
                .myReview(myReview)
                .reviews(new PageResponse<>(content, result.getNumber(), result.getSize(),
                        result.getTotalElements(), result.getTotalPages(), result.isLast()))
                .build();
    }

    @Transactional
    public CreatorReviewResponse vote(String auth0Subject, String username, UUID reviewId, ReviewVoteRequest request) {
        User voter = userService.findByAuth0Subject(auth0Subject);
        User creator = userService.findByUsername(username);
        CreatorReview review = creatorReviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Creator review", reviewId));
        if (!review.getCreatorId().equals(creator.getId())) {
            throw new BusinessException("Review does not belong to this creator");
        }
        ensureVoteAllowed(voter.getId(), creator.getId(), review.getReviewerId());

        CreatorReviewVote vote = creatorReviewVoteRepository.findByCreatorReviewIdAndVoterId(reviewId, voter.getId())
                .orElseGet(() -> new CreatorReviewVote(reviewId, voter.getId(), request.getVote()));
        ReviewVoteValue previous = vote.getId() != null ? vote.getVoteValue() : null;
        vote.setVoteValue(request.getVote());
        creatorReviewVoteRepository.save(vote);

        if (previous != request.getVote()) {
            adjustVoteCounts(review, previous, request.getVote());
            review = creatorReviewRepository.save(review);
        }

        return toResponse(review, Map.of(review.getId(), request.getVote()), voter.getId(), true);
    }

    private void ensureCreatorReviewAllowed(UUID reviewerId, UUID creatorId) {
        if (!canReviewCreator(reviewerId, creatorId)) {
            throw new BusinessException("You can review a creator only after completing 2 purchases from them");
        }
    }

    private boolean canReviewCreator(UUID reviewerId, UUID creatorId) {
        return guidePurchaseRepository.countByBuyerIdAndCreatorIdAndStatus(reviewerId, creatorId, GuidePurchaseStatus.COMPLETED) >= 2;
    }

    private void ensureVoteAllowed(UUID voterId, UUID creatorId, UUID reviewAuthorId) {
        if (!guidePurchaseRepository.existsByBuyerIdAndStatus(voterId, GuidePurchaseStatus.COMPLETED)) {
            throw new BusinessException("Only travelers with completed purchases can vote on reviews");
        }
        if (voterId.equals(reviewAuthorId)) {
            throw new BusinessException("You cannot vote on your own review");
        }
        if (voterId.equals(creatorId)) {
            throw new BusinessException("Creators cannot vote on reviews about their own guides");
        }
    }

    private boolean canVoteOnCreatorReview(User viewer, UUID creatorId, CreatorReview review) {
        if (viewer == null) {
            return false;
        }
        if (!guidePurchaseRepository.existsByBuyerIdAndStatus(viewer.getId(), GuidePurchaseStatus.COMPLETED)) {
            return false;
        }
        return !viewer.getId().equals(review.getReviewerId()) && !viewer.getId().equals(creatorId);
    }

    private void adjustVoteCounts(CreatorReview review, ReviewVoteValue previous, ReviewVoteValue next) {
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

    private void refreshCreatorReviewSummary(UUID creatorId) {
        userProfileRepository.updateCreatorReviewSummary(
                creatorId,
                creatorReviewRepository.averageRatingByCreatorId(creatorId),
                (int) creatorReviewRepository.countByCreatorId(creatorId)
        );
    }

    private CreatorReviewResponse toResponse(
            CreatorReview review,
            Map<UUID, ReviewVoteValue> viewerVotes,
            UUID viewerId,
            boolean canVote
    ) {
        var author = reviewAuthorViewResolver.resolve(List.of(review.getReviewerId())).get(review.getReviewerId());
        return CreatorReviewResponse.builder()
                .id(review.getId())
                .creatorId(review.getCreatorId())
                .reviewerUserId(review.getReviewerId())
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
                .ownedByViewer(viewerId != null && viewerId.equals(review.getReviewerId()))
                .canVote(canVote)
                .build();
    }
}
