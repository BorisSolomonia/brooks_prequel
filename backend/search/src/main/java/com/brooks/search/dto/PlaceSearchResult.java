package com.brooks.search.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
@AllArgsConstructor
public class PlaceSearchResult {
    private UUID id;
    private String name;
    private String category;
    private String address;
    private Double latitude;
    private Double longitude;
    private UUID guideId;
    private String guideTitle;
    private String guideRegion;
}
