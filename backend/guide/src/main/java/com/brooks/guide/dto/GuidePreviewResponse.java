package com.brooks.guide.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Getter
@Builder
public class GuidePreviewResponse {
    private UUID id;
    private String title;
    private String coverImageUrl;
    private int dayCount;
    private int placeCount;
    private int priceCents;
    private String currency;
    private UUID creatorId;
    private Integer salePriceCents;
    private Instant saleEndsAt;
    private String region;
    private String creatorUsername;

    // Social proof
    private int purchaseCount;
    private double averageRating;
    private int reviewCount;

    // Seasonal signal
    private Integer bestSeasonStartMonth;
    private Integer bestSeasonEndMonth;
    private String bestSeasonLabel;

    // Endowment effect: full Day 1 content
    private DayPreview firstDay;
    // Remaining days as stubs
    private List<LockedDayStub> lockedDays;

    // Most recent reviews for social proof
    private List<ReviewPreview> recentReviews;

    @Getter
    @Builder
    public static class ReviewPreview {
        private short rating;
        private String reviewText;
        private Instant createdAt;
    }

    @Getter
    @Builder
    public static class DayPreview {
        private int dayNumber;
        private String title;
        private String description;
        private List<BlockPreview> blocks;
    }

    @Getter
    @Builder
    public static class BlockPreview {
        private String title;
        private String description;
        private String blockType;
        private Integer suggestedStartMinute;
        private List<PlacePreview> places;
    }

    @Getter
    @Builder
    public static class PlacePreview {
        private String name;
        private String address;
        private String category;
        private Integer priceLevel;
        private Integer suggestedStartMinute;
        private Integer suggestedDurationMinutes;
        private Double latitude;
        private Double longitude;
    }

    @Getter
    @Builder
    public static class LockedDayStub {
        private int dayNumber;
        private String title;
    }
}
