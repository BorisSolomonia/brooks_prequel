package com.brooks.guide.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;
import java.util.UUID;

@Getter
@Builder
public class GuideBlockResponse {
    private UUID id;
    private int position;
    private String title;
    private String description;
    private String blockType;
    private String blockCategory;
    private Integer suggestedStartMinute;
    private Integer suggestedDurationMinutes;
    private List<GuidePlaceResponse> places;
}
