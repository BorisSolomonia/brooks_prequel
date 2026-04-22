package com.brooks.guide.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
public class MyTripItemResponse {
    private UUID id;
    private UUID placeId;
    private int dayNumber;
    private int blockPosition;
    private int placePosition;
    private String blockTitle;
    private String blockCategory;
    private String placeName;
    private String placeAddress;
    private Double latitude;
    private Double longitude;
    private Integer suggestedStartMinute;
    private Integer suggestedDurationMinutes;
    private Instant scheduledStart;
    private Instant scheduledEnd;
    private boolean skipped;
    private boolean visited;
    private Instant visitedAt;
}
