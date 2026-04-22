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
    private String currency;
    private Integer versionNumber;
    private String creatorUsername;
    private Instant savedAt;
    private Instant purchasedAt;
}
