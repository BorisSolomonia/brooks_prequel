package com.brooks.profile.service;

import com.brooks.profile.domain.UserProfile;
import com.brooks.profile.dto.InfluencerMapResponse;
import com.brooks.profile.repository.UserProfileRepository.InfluencerMapProjection;
import com.brooks.profile.repository.UserProfileRepository;
import com.brooks.user.domain.User;
import com.brooks.user.domain.UserStatus;
import com.brooks.user.service.UserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProfileServiceTest {

    @Mock
    private UserProfileRepository profileRepository;

    @Mock
    private UserService userService;

    @InjectMocks
    private ProfileService profileService;

    @Test
    void getInfluencerMapReturnsRankedPins() {
        InfluencerMapProjection topCreator = projection(
                UUID.randomUUID(), "top-user", "Top", 41.71, 44.79, 120, 7, true, 1
        );
        InfluencerMapProjection secondCreator = projection(
                UUID.randomUUID(), "second-user", "Second", 40.17, 44.51, 90, 5, false, 2
        );
        when(profileRepository.findInfluencerPins(null))
                .thenReturn(List.of(topCreator, secondCreator));

        InfluencerMapResponse response = profileService.getInfluencerMap(null);

        assertThat(response.getPins()).hasSize(2);
        assertThat(response.getPins().get(0).getUsername()).isEqualTo("top-user");
        assertThat(response.getPins().get(0).getRank()).isEqualTo(1);
        assertThat(response.getPins().get(1).getUsername()).isEqualTo("second-user");
        assertThat(response.getPins().get(1).getRank()).isEqualTo(2);
        assertThat(response.getPins()).noneMatch(pin -> "Hidden".equals(pin.getDisplayName()));
    }

    private static UserProfile profile(
            UUID userId,
            String displayName,
            Double latitude,
            Double longitude,
            int followerCount,
            int guideCount,
            boolean verified) {
        UserProfile profile = new UserProfile(userId);
        profile.setDisplayName(displayName);
        profile.setLatitude(latitude);
        profile.setLongitude(longitude);
        profile.setFollowerCount(followerCount);
        profile.setGuideCount(guideCount);
        profile.setVerified(verified);
        return profile;
    }

    private static InfluencerMapProjection projection(
            UUID userId,
            String username,
            String displayName,
            Double latitude,
            Double longitude,
            int followerCount,
            int guideCount,
            boolean verified,
            int rank) {
        InfluencerMapProjection projection = mock(InfluencerMapProjection.class);
        when(projection.getUserId()).thenReturn(userId);
        when(projection.getUsername()).thenReturn(username);
        when(projection.getDisplayName()).thenReturn(displayName);
        when(projection.getLatitude()).thenReturn(latitude);
        when(projection.getLongitude()).thenReturn(longitude);
        when(projection.getFollowerCount()).thenReturn(followerCount);
        when(projection.getGuideCount()).thenReturn(guideCount);
        when(projection.getVerified()).thenReturn(verified);
        when(projection.getRank()).thenReturn(rank);
        return projection;
    }

    private static User user(UUID id, String username, Instant createdAt) {
        User user = new User();
        user.setId(id);
        user.setUsername(username);
        user.setStatus(UserStatus.ACTIVE);
        user.setCreatedAt(createdAt);
        return user;
    }
}
