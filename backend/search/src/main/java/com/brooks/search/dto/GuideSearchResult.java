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
    private String currency;
    private String creatorUsername;
    private String creatorDisplayName;
}
