package com.brooks.profile.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
@AllArgsConstructor
public class InfluencerMapPinResponse {
    private UUID userId;
    private String username;
    private String displayName;
    private String avatarUrl;
    private String bio;
    private String region;
    private Double latitude;
    private Double longitude;
    private int followerCount;
    private int guideCount;
    private UUID guideId;
    private String guideTitle;
    private String guidePrimaryCity;
    private String guideCountry;
    private Integer guidePriceCents;
    private Integer guideDayCount;
    private Integer guidePlaceCount;
    private boolean verified;
    private double creatorRatingAverage;
    private int rank;
}
