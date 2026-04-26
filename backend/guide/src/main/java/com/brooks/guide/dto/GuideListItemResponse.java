package com.brooks.guide.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
public class GuideListItemResponse {
    private UUID id;
    private String title;
    private String coverImageUrl;
    private String region;
    private String status;
    private int dayCount;
    private int placeCount;
    private int priceCents;
    private Integer salePriceCents;
    private Instant saleEndsAt;
    private int effectivePriceCents;
    private String currency;
    private int versionNumber;
    private String displayLocation;
    private int spotCount;
    private double averageRating;
    private int reviewCount;
    private int weeklyPopularityScore;
    private boolean popularThisWeek;
    private Instant createdAt;
    private Instant updatedAt;
}
