package com.brooks.profile.service;

import com.brooks.common.exception.BusinessException;
import com.brooks.common.exception.ResourceNotFoundException;
import com.brooks.profile.domain.UserProfile;
import com.brooks.profile.dto.InfluencerMapPinResponse;
import com.brooks.profile.dto.InfluencerMapResponse;
import com.brooks.profile.dto.ProfileResponse;
import com.brooks.profile.dto.ProfileUpdateRequest;
import com.brooks.profile.repository.UserProfileRepository;
import com.brooks.user.domain.User;
import com.brooks.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProfileService {

    private final UserProfileRepository profileRepository;
    private final UserService userService;

    // Hard cap on creator pins returned to the map. The web client renders one DOM
    // marker (+ avatar image) per pin and the Android WebView OOMs on an unbounded
    // set, so bound it here too — defence in depth alongside the client-side
    // viewport limiting. Configurable; default 500 is generous for a regional map.
    @Value("${app.maps.influencer-pins.max:500}")
    private int maxInfluencerPins;

    @Transactional
    public ProfileResponse getOrCreateProfile(String auth0Subject) {
        User user = userService.findByAuth0Subject(auth0Subject);
        UserProfile profile = profileRepository.findByUserId(user.getId())
                .orElseGet(() -> profileRepository.save(new UserProfile(user.getId())));
        return toResponse(user, profile);
    }

    @Transactional
    public ProfileResponse updateProfile(String auth0Subject, ProfileUpdateRequest request) {
        User user = userService.findByAuth0Subject(auth0Subject);
        UserProfile profile = profileRepository.findByUserId(user.getId())
                .orElseGet(() -> profileRepository.save(new UserProfile(user.getId())));

        if (request.getUsername() != null && !request.getUsername().equals(user.getUsername())) {
            if (!userService.isUsernameAvailable(request.getUsername())) {
                throw new BusinessException("Username already taken");
            }
            user.setUsername(request.getUsername());
        }
        if (request.getDisplayName() != null) profile.setDisplayName(request.getDisplayName());
        if (request.getBio() != null) profile.setBio(request.getBio());
        if (request.getAvatarUrl() != null) profile.setAvatarUrl(request.getAvatarUrl());
        if (request.getRegion() != null) profile.setRegion(request.getRegion());
        if (request.getInterests() != null) profile.setInterests(request.getInterests());
        if (request.getLatitude() != null) profile.setLatitude(request.getLatitude());
        if (request.getLongitude() != null) profile.setLongitude(request.getLongitude());

        if (!user.isOnboardingCompleted()
                && profile.getDisplayName() != null
                && user.getUsername() != null) {
            user.setOnboardingCompleted(true);
        }

        return toResponse(user, profile);
    }

    @Transactional(readOnly = true)
    public ProfileResponse getPublicProfile(String username) {
        User user = userService.findByUsername(username);
        UserProfile profile = profileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Profile", username));
        return toResponse(user, profile);
    }

    // Heavy native query with window functions + LATERAL joins. Cached for 5 min via the
    // "rankings" Caffeine cache (see CacheConfig). Key uses "global" sentinel for null
    // region so the regionless variant doesn't collide with a real region named "".
    @Transactional(readOnly = true)
    @Cacheable(value = "rankings", key = "'pins:' + (#region == null || #region.isBlank() ? 'global' : #region)")
    public InfluencerMapResponse getInfluencerMap(String region) {
        String regionParam = (region != null && !region.isBlank()) ? region : null;
        List<InfluencerMapPinResponse> pins = profileRepository.findInfluencerPins(regionParam, maxInfluencerPins).stream()
                .map(row -> InfluencerMapPinResponse.builder()
                        .userId(row.getUserId())
                        .username(row.getUsername())
                        .displayName(row.getDisplayName() != null && !row.getDisplayName().isBlank()
                                ? row.getDisplayName() : row.getUsername())
                        .avatarUrl(row.getAvatarUrl())
                        .bio(row.getBio())
                        .region(row.getRegion())
                        .latitude(row.getLatitude())
                        .longitude(row.getLongitude())
                        .followerCount(row.getFollowerCount())
                        .guideCount(row.getGuideCount())
                        .guideId(row.getGuideId())
                        .guideTitle(row.getGuideTitle())
                        .guidePrimaryCity(row.getGuidePrimaryCity())
                        .guideCountry(row.getGuideCountry())
                        .guidePriceCents(row.getGuidePriceCents())
                        .guideDayCount(row.getGuideDayCount())
                        .guidePlaceCount(row.getGuidePlaceCount())
                        .verified(row.getVerified())
                        .creatorRatingAverage(row.getCreatorRatingAverage())
                        .rank(row.getRank())
                        .build())
                .toList();

        return InfluencerMapResponse.builder()
                .pins(pins)
                .build();
    }

    private ProfileResponse toResponse(User user, UserProfile profile) {
        return ProfileResponse.builder()
                .userId(user.getId())
                .email(user.getEmail())
                .username(user.getUsername())
                .displayName(profile.getDisplayName())
                .bio(profile.getBio())
                .avatarUrl(profile.getAvatarUrl())
                .region(profile.getRegion())
                .interests(profile.getInterests())
                .latitude(profile.getLatitude())
                .longitude(profile.getLongitude())
                .role(user.getRole().name())
                .followerCount(profile.getFollowerCount())
                .followingCount(profile.getFollowingCount())
                .guideCount(profile.getGuideCount())
                .verified(profile.isVerified())
                .creatorRatingAverage(profile.getCreatorRatingAverage())
                .creatorReviewCount(profile.getCreatorReviewCount())
                .onboardingCompleted(user.isOnboardingCompleted())
                .build();
    }

}
