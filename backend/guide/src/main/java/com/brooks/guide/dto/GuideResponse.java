package com.brooks.guide.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Getter
@Builder
public class GuideResponse {
    private UUID id;
    private UUID creatorId;
    private String title;
    private String description;
    private String coverImageUrl;
    private String region;
    private String primaryCity;
    private String country;
    private String timezone;
    private int priceCents;
    private Integer salePriceCents;
    private Instant saleEndsAt;
    private int effectivePriceCents;
    private String currency;
    private String status;
    private int versionNumber;
    private int dayCount;
    private int placeCount;
    private String displayLocation;
    private int spotCount;
    private double averageRating;
    private int reviewCount;
    private int weeklyPopularityScore;
    private boolean popularThisWeek;
    private List<String> tags;
    private List<GuideDayResponse> days;
    private Instant createdAt;
    private Instant updatedAt;
    private String travelerStage;
    private List<String> personas;
    private Integer bestSeasonStartMonth;
    private Integer bestSeasonEndMonth;
    private String bestSeasonLabel;
    private Double latitude;
    private Double longitude;
}
