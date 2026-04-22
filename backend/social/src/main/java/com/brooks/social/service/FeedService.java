package com.brooks.social.service;

import com.brooks.profile.domain.UserProfile;
import com.brooks.profile.repository.UserProfileRepository;
import com.brooks.guide.domain.Guide;
import com.brooks.guide.repository.GuideRepository;
import com.brooks.social.domain.GuideStory;
import com.brooks.social.dto.FeedItemResponse;
import com.brooks.social.repository.GuideStoryRepository;
import com.brooks.user.domain.User;
import com.brooks.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FeedService {

    private final FollowService followService;
    private final GuideStoryRepository storyRepository;
    private final GuideRepository guideRepository;
    private final UserProfileRepository profileRepository;
    private final UserService userService;

    @Transactional(readOnly = true)
    public List<FeedItemResponse> getFeed(String auth0Subject, int page, int size) {
        User user = userService.findByAuth0Subject(auth0Subject);
        List<UUID> followingIds = followService.getFollowingIds(user.getId());

        if (followingIds.isEmpty()) {
            return Collections.emptyList();
        }

        Instant now = Instant.now();
        List<GuideStory> stories = storyRepository.findActiveStoriesByCreatorIds(followingIds, now);

        // Batch-load creators and profiles to avoid N+1 queries
        Set<UUID> creatorIds = stories.stream()
                .map(GuideStory::getCreatorId)
                .collect(Collectors.toSet());
        Map<UUID, User> creatorsById = userService.findAllByIds(creatorIds);
        Map<UUID, UserProfile> profilesByUserId = profileRepository.findAllByUserIdIn(creatorIds)
                .stream()
                .collect(Collectors.toMap(UserProfile::getUserId, p -> p));

        return stories.stream()
                .map(story -> {
                    User creator = creatorsById.get(story.getCreatorId());
                    UserProfile profile = profilesByUserId.get(story.getCreatorId());
                    Guide guide = story.getLinkGuideId() != null
                            ? guideRepository.findById(story.getLinkGuideId()).orElse(null)
                            : null;
                    String displayName = (profile != null && profile.getDisplayName() != null)
                            ? profile.getDisplayName()
                            : (creator != null ? creator.getUsername() : null);
                    String avatarUrl = profile != null ? profile.getAvatarUrl() : null;
                    String username = creator != null ? creator.getUsername() : null;
                    UUID creatorId = creator != null ? creator.getId() : story.getCreatorId();

                    return FeedItemResponse.builder()
                            .id(story.getId())
                            .type("story")
                            .creatorId(creatorId)
                            .creatorUsername(username)
                            .creatorDisplayName(displayName)
                            .creatorAvatarUrl(avatarUrl)
                            .title(guide != null ? guide.getTitle() : "Guide promotion")
                            .imageUrl(story.getImageUrl())
                            .caption(story.getCaption())
                            .createdAt(story.getCreatedAt())
                            .build();
                })
                .sorted(Comparator.comparing(FeedItemResponse::getCreatedAt).reversed())
                .skip((long) page * size)
                .limit(size)
                .collect(Collectors.toList());
    }
}
