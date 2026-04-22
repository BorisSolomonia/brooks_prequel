package com.brooks.social.service;

import com.brooks.common.exception.BusinessException;
import com.brooks.profile.repository.UserProfileRepository;
import com.brooks.social.domain.Follow;
import com.brooks.social.dto.FollowResponse;
import com.brooks.social.event.FollowEvent;
import com.brooks.social.repository.FollowRepository;
import com.brooks.user.domain.User;
import com.brooks.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

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
        updateCounts(follower.getId(), targetUserId);
        eventPublisher.publishEvent(new FollowEvent(follower.getId(), targetUserId, true));

        return buildFollowResponse(follower.getId(), targetUserId, true);
    }

    @Transactional
    public FollowResponse unfollow(String auth0Subject, UUID targetUserId) {
        User follower = userService.findByAuth0Subject(auth0Subject);

        Follow follow = followRepository.findByFollowerIdAndFollowingId(follower.getId(), targetUserId)
                .orElseThrow(() -> new BusinessException("Not following this user"));

        followRepository.delete(follow);
        updateCounts(follower.getId(), targetUserId);
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

    private void updateCounts(UUID followerId, UUID followingId) {
        long followingCount = followRepository.countByFollowerId(followerId);
        long followerCount = followRepository.countByFollowingId(followingId);

        profileRepository.findByUserId(followerId)
                .ifPresent(p -> { p.setFollowingCount((int) followingCount); profileRepository.save(p); });
        profileRepository.findByUserId(followingId)
                .ifPresent(p -> { p.setFollowerCount((int) followerCount); profileRepository.save(p); });
    }

    private FollowResponse buildFollowResponse(UUID followerId, UUID targetUserId, boolean isFollowing) {
        return FollowResponse.builder()
                .following(isFollowing)
                .followerCount(followRepository.countByFollowingId(targetUserId))
                .followingCount(followRepository.countByFollowerId(targetUserId))
                .build();
    }
}
