package com.brooks.social.service;

import com.brooks.common.exception.ResourceNotFoundException;
import com.brooks.common.util.BusinessConstants;
import com.brooks.guide.domain.Guide;
import com.brooks.guide.domain.GuideStatus;
import com.brooks.guide.repository.GuideRepository;
import com.brooks.profile.domain.UserProfile;
import com.brooks.profile.repository.UserProfileRepository;
import com.brooks.social.domain.GuideStory;
import com.brooks.social.dto.CreatorStoryStrip;
import com.brooks.social.dto.StoryCreateRequest;
import com.brooks.social.dto.StoryResponse;
import com.brooks.social.repository.GuideStoryRepository;
import com.brooks.user.domain.User;
import com.brooks.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StoryService {

    private final GuideStoryRepository storyRepository;
    private final GuideRepository guideRepository;
    private final UserProfileRepository profileRepository;
    private final UserService userService;
    private final FollowService followService;

    @Transactional
    public StoryResponse createStory(String auth0Subject, StoryCreateRequest request) {
        User user = userService.findByAuth0Subject(auth0Subject);
        Guide guide = findOwnedPublishedGuide(user.getId(), request.getGuideId());

        GuideStory story = new GuideStory();
        story.setCreatorId(user.getId());
        story.setImageUrl(resolvePromotionImage(guide));
        story.setCaption(buildPromotionText(guide));
        story.setLinkGuideId(guide.getId());
        story.setExpiresAt(Instant.now().plus(BusinessConstants.STORY_EXPIRY_HOURS, ChronoUnit.HOURS));

        story = storyRepository.save(story);
        return toResponse(story, guide, user.getUsername(), getAvatarUrl(user.getId()));
    }

    @Transactional
    public void deleteStory(String auth0Subject, UUID storyId) {
        User user = userService.findByAuth0Subject(auth0Subject);
        GuideStory story = storyRepository.findById(storyId)
                .orElseThrow(() -> new ResourceNotFoundException("Story", storyId));

        if (!story.getCreatorId().equals(user.getId())) {
            throw new com.brooks.common.exception.BusinessException("Cannot delete another user's story");
        }

        storyRepository.delete(story);
    }

    @Transactional(readOnly = true)
    public List<CreatorStoryStrip> getFeedStoryStrips(String auth0Subject) {
        User user = userService.findByAuth0Subject(auth0Subject);
        List<UUID> followingIds = followService.getFollowingIds(user.getId());

        if (followingIds.isEmpty()) {
            return Collections.emptyList();
        }

        Instant now = Instant.now();
        List<GuideStory> stories = storyRepository.findActiveStoriesByCreatorIds(followingIds, now);

        Map<UUID, List<GuideStory>> grouped = stories.stream()
                .collect(Collectors.groupingBy(GuideStory::getCreatorId, LinkedHashMap::new, Collectors.toList()));

        // Batch-load creators and profiles to avoid N+1 queries
        Set<UUID> creatorIds = grouped.keySet();
        Map<UUID, User> creatorsById = userService.findAllByIds(creatorIds);
        Map<UUID, UserProfile> profilesByUserId = profileRepository.findAllByUserIdIn(creatorIds)
                .stream()
                .collect(Collectors.toMap(UserProfile::getUserId, p -> p));

        List<CreatorStoryStrip> strips = new ArrayList<>();
        for (Map.Entry<UUID, List<GuideStory>> entry : grouped.entrySet()) {
            UUID creatorId = entry.getKey();
            User creator = creatorsById.get(creatorId);
            UserProfile profile = profilesByUserId.get(creatorId);
            String avatarUrl = profile != null ? profile.getAvatarUrl() : null;

            String username = creator != null ? creator.getUsername() : null;
            List<StoryResponse> storyResponses = entry.getValue().stream()
                    .map(s -> toResponse(s, username, avatarUrl))
                    .collect(Collectors.toList());

            strips.add(CreatorStoryStrip.builder()
                    .creatorId(creatorId)
                    .creatorUsername(username)
                    .creatorAvatarUrl(avatarUrl)
                    .hasActiveStories(true)
                    .stories(storyResponses)
                    .build());
        }

        return strips;
    }

    @Transactional(readOnly = true)
    public List<StoryResponse> getCreatorStories(UUID creatorId) {
        Instant now = Instant.now();
        User creator = userService.findById(creatorId);
        String avatarUrl = getAvatarUrl(creatorId);

        return storyRepository.findByCreatorIdAndExpiresAtAfterOrderByCreatedAtDesc(creatorId, now)
                .stream()
                .map(s -> toResponse(s, creator.getUsername(), avatarUrl))
                .collect(Collectors.toList());
    }

    private String getAvatarUrl(UUID userId) {
        return profileRepository.findByUserId(userId)
                .map(UserProfile::getAvatarUrl)
                .orElse(null);
    }

    private StoryResponse toResponse(GuideStory story, String username, String avatarUrl) {
        Guide guide = story.getLinkGuideId() != null
                ? guideRepository.findById(story.getLinkGuideId()).orElse(null)
                : null;
        return toResponse(story, guide, username, avatarUrl);
    }

    private StoryResponse toResponse(GuideStory story, Guide guide, String username, String avatarUrl) {
        return StoryResponse.builder()
                .id(story.getId())
                .creatorId(story.getCreatorId())
                .creatorUsername(username)
                .creatorAvatarUrl(avatarUrl)
                .guideId(story.getLinkGuideId())
                .guideTitle(guide != null ? guide.getTitle() : "Guide promotion")
                .guideRegion(guide != null ? guide.getRegion() : null)
                .guidePrimaryCity(guide != null ? guide.getPrimaryCity() : null)
                .imageUrl(guide != null ? resolvePromotionImage(guide) : story.getImageUrl())
                .promotionText(guide != null ? buildPromotionText(guide) : story.getCaption())
                .expiresAt(story.getExpiresAt())
                .viewCount(story.getViewCount())
                .createdAt(story.getCreatedAt())
                .build();
    }

    private Guide findOwnedPublishedGuide(UUID creatorId, UUID guideId) {
        Guide guide = guideRepository.findById(guideId)
                .orElseThrow(() -> new ResourceNotFoundException("Guide", guideId));
        if (!guide.getCreatorId().equals(creatorId)) {
            throw new com.brooks.common.exception.BusinessException("Cannot promote another creator's guide");
        }
        if (guide.getStatus() != GuideStatus.PUBLISHED) {
            throw new com.brooks.common.exception.BusinessException("Only published guides can be promoted in stories");
        }
        return guide;
    }

    private String resolvePromotionImage(Guide guide) {
        return guide.getCoverImageUrl() != null && !guide.getCoverImageUrl().isBlank()
                ? guide.getCoverImageUrl()
                : "https://placehold.co/1080x1920?text=Guide+Promotion";
    }

    private String buildPromotionText(Guide guide) {
        String destination = guide.getPrimaryCity() != null && !guide.getPrimaryCity().isBlank()
                ? guide.getPrimaryCity()
                : guide.getRegion();
        if (destination == null || destination.isBlank()) {
            return "New guide promotion";
        }
        return "Explore " + guide.getTitle() + " in " + destination;
    }
}
