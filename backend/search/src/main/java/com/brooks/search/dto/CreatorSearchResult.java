package com.brooks.search.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
@AllArgsConstructor
public class CreatorSearchResult {
    private UUID userId;
    private String username;
    private String displayName;
    private String avatarUrl;
    private String region;
    private int followerCount;
    private int guideCount;
    private boolean verified;
    // Aggregate creator rating (user_profiles.creator_rating_average) — surfaced
    // so the People results can show stars and be filtered/sorted by rating.
    private double creatorRatingAverage;
}
