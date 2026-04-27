package com.brooks.guide.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;
import java.util.UUID;

@Getter
@Builder
public class GuideDayResponse {
    private UUID id;
    private int dayNumber;
    private String title;
    private String description;
    private String imageUrl;
    private List<GuideBlockResponse> blocks;
}
