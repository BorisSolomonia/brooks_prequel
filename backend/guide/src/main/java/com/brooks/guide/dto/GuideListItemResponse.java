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
    private String currency;
    private int versionNumber;
    private Instant createdAt;
    private Instant updatedAt;
}
