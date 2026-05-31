package com.brooks.guide.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Getter
@Builder
public class MyTripSummaryResponse {
    private UUID id;
    private UUID guideId;
    private UUID guideVersionId;
    private int guideVersionNumber;
    private String title;
    private String coverImageUrl;
    private String region;
    private String primaryCity;
    private String country;
    private String timezone;
    private int dayCount;
    private int placeCount;
    private int amountCents;
    private String currency;
    private Instant purchasedAt;
    private LocalDate tripStartDate;
    private LocalTime tripStartTime;
    private LocalDate tripEndDate;
    private String tripSource;
    // True when the creator has deleted/unpublished the guide — the buyer keeps it ("No longer sold").
    private boolean noLongerSold;
    // True when the buyer has hidden this purchased guide from their list.
    private boolean hidden;
}
