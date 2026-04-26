package com.brooks.guide.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
public class GuideLibraryItemResponse {
    private UUID id;
    private String title;
    private String coverImageUrl;
    private String region;
    private int dayCount;
    private int placeCount;
    private int priceCents;
    private Integer salePriceCents;
    private Instant saleEndsAt;
    private int effectivePriceCents;
    private String currency;
    private Integer versionNumber;
    private String creatorUsername;
    private String displayLocation;
    private int spotCount;
    private double averageRating;
    private int reviewCount;
    private int weeklyPopularityScore;
    private boolean popularThisWeek;
    private boolean savedByViewer;
    private Instant savedAt;
    private Instant purchasedAt;
}
