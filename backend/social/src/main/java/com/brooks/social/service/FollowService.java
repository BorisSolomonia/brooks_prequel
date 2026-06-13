package com.brooks.social.service;

import com.brooks.common.exception.BusinessException;
import com.brooks.profile.repository.UserProfileRepository;
import com.brooks.social.domain.Follow;
import com.brooks.social.dto.FollowResponse;
import com.brooks.social.dto.FollowerSummaryResponse;
import com.brooks.social.event.FollowEvent;
import com.brooks.social.repository.FollowRepository;
import com.brooks.profile.domain.UserProfile;
import com.brooks.user.domain.User;
import com.brooks.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FollowService {

    private final FollowRepository followRepository;
    private final UserProfileRepository profileRepository;
    private final UserService userService;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public FollowResponse follow(String auth0Subject, UUID targetUserId) {
        User follower = userService.findByAuth0Subject(auth0Subject);

        if (follower.getId().equals(targetUserId)) {
            throw new BusinessException("Cannot follow yourself");
        }

        // Verify target exists
        userService.findById(targetUserId);

        if (followRepository.existsByFollowerIdAndFollowingId(follower.getId(), targetUserId)) {
            throw new BusinessException("Already following this user");
        }

        followRepository.save(new Follow(follower.getId(), targetUserId));
        // Atomic +1 on each side avoids the read-modify-write race that drifted
        // counts under concurrent follow/unfollow operations.
        profileRepository.adjustFollowingCount(follower.getId(), 1);
        profileRepository.adjustFollowerCount(targetUserId, 1);
        eventPublisher.publishEvent(new FollowEvent(follower.getId(), targetUserId, true));

        return buildFollowResponse(follower.getId(), targetUserId, true);
    }

    @Transactional
    public FollowResponse unfollow(String auth0Subject, UUID targetUserId) {
        User follower = userService.findByAuth0Subject(auth0Subject);

        Follow follow = followRepository.findByFollowerIdAndFollowingId(follower.getId(), targetUserId)
                .orElseThrow(() -> new BusinessException("Not following this user"));

        followRepository.delete(follow);
        profileRepository.adjustFollowingCount(follower.getId(), -1);
        profileRepository.adjustFollowerCount(targetUserId, -1);
        eventPublisher.publishEvent(new FollowEvent(follower.getId(), targetUserId, false));

        return buildFollowResponse(follower.getId(), targetUserId, false);
    }

    @Transactional(readOnly = true)
    public FollowResponse getFollowStatus(String auth0Subject, UUID targetUserId) {
        User user = userService.findByAuth0Subject(auth0Subject);
        boolean isFollowing = followRepository.existsByFollowerIdAndFollowingId(user.getId(), targetUserId);
        return buildFollowResponse(user.getId(), targetUserId, isFollowing);
    }

    @Transactional(readOnly = true)
    public List<UUID> getFollowingIds(UUID userId) {
        return followRepository.findFollowingIdsByFollowerId(userId);
    }

    @Transactional(readOnly = true)
    public List<UUID> getFollowerIds(UUID userId) {
        return followRepository.findFollowerIdsByFollowingId(userId);
    }

    @Transactional(readOnly = true)
    public List<FollowerSummaryResponse> getMyFollowers(String auth0Subject) {
        return listFollowersOf(auth0Subject);
    }

    @Transactional(readOnly = true)
    public List<FollowerSummaryResponse> listFollowersOf(String auth0Subject) {
        User me = userService.findByAuth0Subject(auth0Subject);
        return summariesFor(followRepository.findFollowerIdsByFollowingId(me.getId()));
    }

    @Transactional(readOnly = true)
    public List<FollowerSummaryResponse> listFollowingOf(String auth0Subject) {
        User me = userService.findByAuth0Subject(auth0Subject);
        return summariesFor(followRepository.findFollowingIdsByFollowerId(me.getId()));
    }

    private List<FollowerSummaryResponse> summariesFor(List<UUID> userIds) {
        if (userIds.isEmpty()) return List.of();
        Map<UUID, User> userMap = userService.findAllByIds(userIds);
        Map<UUID, UserProfile> profileMap = profileRepository.findAllByUserIdIn(userIds)
                .stream().collect(Collectors.toMap(UserProfile::getUserId, p -> p));
        return userIds.stream()
                .filter(userMap::containsKey)
                .map(id -> {
                    User u = userMap.get(id);
                    UserProfile p = profileMap.get(id);
                    return FollowerSummaryResponse.builder()
                            .userId(id)
                            .username(u.getUsername())
                            .displayName(p != null ? p.getDisplayName() : u.getUsername())
                            .avatarUrl(p != null ? p.getAvatarUrl() : null)
                            .build();
                })
                .collect(Collectors.toList());
    }

    private FollowResponse buildFollowResponse(UUID followerId, UUID targetUserId, boolean isFollowing) {
        // BOR-61: read the denormalised counts on user_profiles instead of two live
        // COUNT(*) scans. These columns are maintained atomically on every
        // follow/unfollow (adjustFollowerCount/adjustFollowingCount) and are already
        // the source of truth the profile UI displays, so this is both faster and more
        // consistent. In the write paths the counts are updated earlier in the same
        // transaction, so this read-after-write reflects the change. Fall back to the
        // exact COUNT only if a profile row is somehow absent (legacy/edge case).
        UserProfile targetProfile = profileRepository.findByUserId(targetUserId).orElse(null);
        long followerCount = targetProfile != null
                ? targetProfile.getFollowerCount()
                : followRepository.countByFollowingId(targetUserId);
        long followingCount = targetProfile != null
                ? targetProfile.getFollowingCount()
                : followRepository.countByFollowerId(targetUserId);
        return FollowResponse.builder()
                .following(isFollowing)
                .followerCount(followerCount)
                .followingCount(followingCount)
                .build();
    }
}
