package com.brooks.guide.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;
import java.util.UUID;

@Getter
@Builder
public class GuidePlaceResponse {
    private UUID id;
    private int position;
    private String name;
    private String description;
    private String address;
    private Double latitude;
    private Double longitude;
    private String googlePlaceId;
    private String category;
    private Integer priceLevel;
    private Integer suggestedStartMinute;
    private Integer suggestedDurationMinutes;
    private boolean sponsored;
    private List<GuidePlaceImageResponse> images;
}
