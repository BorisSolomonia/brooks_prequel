package com.brooks.social.service;

import com.brooks.profile.domain.UserProfile;
import com.brooks.profile.repository.UserProfileRepository;
import com.brooks.social.dto.FollowResponse;
import com.brooks.social.repository.FollowRepository;
import com.brooks.user.domain.User;
import com.brooks.user.service.UserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FollowServiceTest {

    @Mock
    private FollowRepository followRepository;

    @Mock
    private UserProfileRepository profileRepository;

    @Mock
    private UserService userService;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private FollowService followService;

    @Test
    void getFollowStatusUsesDenormalizedCountsAndAvoidsCountQueries() {
        UUID viewerId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        when(userService.findByAuth0Subject("viewer-sub")).thenReturn(userWithId(viewerId));
        when(followRepository.existsByFollowerIdAndFollowingId(viewerId, targetId)).thenReturn(true);

        UserProfile targetProfile = new UserProfile(targetId);
        targetProfile.setFollowerCount(42);
        targetProfile.setFollowingCount(7);
        when(profileRepository.findByUserId(targetId)).thenReturn(Optional.of(targetProfile));

        FollowResponse response = followService.getFollowStatus("viewer-sub", targetId);

        assertThat(response.isFollowing()).isTrue();
        assertThat(response.getFollowerCount()).isEqualTo(42);
        assertThat(response.getFollowingCount()).isEqualTo(7);
        // The whole point of BOR-61: the denormalised columns replace the live COUNTs.
        verify(followRepository, never()).countByFollowingId(targetId);
        verify(followRepository, never()).countByFollowerId(targetId);
    }

    @Test
    void getFollowStatusFallsBackToCountWhenProfileMissing() {
        UUID viewerId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        when(userService.findByAuth0Subject("viewer-sub")).thenReturn(userWithId(viewerId));
        when(followRepository.existsByFollowerIdAndFollowingId(viewerId, targetId)).thenReturn(false);
        when(profileRepository.findByUserId(targetId)).thenReturn(Optional.empty());
        when(followRepository.countByFollowingId(targetId)).thenReturn(5L);
        when(followRepository.countByFollowerId(targetId)).thenReturn(3L);

        FollowResponse response = followService.getFollowStatus("viewer-sub", targetId);

        assertThat(response.isFollowing()).isFalse();
        assertThat(response.getFollowerCount()).isEqualTo(5);
        assertThat(response.getFollowingCount()).isEqualTo(3);
    }

    private static User userWithId(UUID id) {
        User user = new User();
        user.setId(id);
        return user;
    }
}
