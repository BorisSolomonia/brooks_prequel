package com.brooks.profile.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
@AllArgsConstructor
public class ProfileResponse {
    private UUID userId;
    private String email;
    private String username;
    private String displayName;
    private String bio;
    private String avatarUrl;
    private String region;
    private String interests;
    private Double latitude;
    private Double longitude;
    private String role;
    private int followerCount;
    private int followingCount;
    private int guideCount;
    private boolean verified;
    private double creatorRatingAverage;
    private int creatorReviewCount;
    private boolean onboardingCompleted;
}
