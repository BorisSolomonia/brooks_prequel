package com.brooks.search.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
@AllArgsConstructor
public class GuideSearchResult {
    private UUID id;
    private String title;
    private String coverImageUrl;
    private String region;
    private String primaryCity;
    private int dayCount;
    private int placeCount;
    private int priceCents;
    private Integer salePriceCents;
    private int effectivePriceCents;
    private String currency;
    private String displayLocation;
    private int spotCount;
    private double averageRating;
    private int reviewCount;
    private int weeklyPopularityScore;
    private boolean popularThisWeek;
    private String creatorUsername;
    private String creatorDisplayName;
}
