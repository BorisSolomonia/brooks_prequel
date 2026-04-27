package com.brooks.guide.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Getter
@Builder
public class MyTripDetailResponse {
    private UUID id;
    private UUID guideId;
    private UUID guideVersionId;
    private int guideVersionNumber;
    private Instant purchasedAt;
    private LocalDate tripStartDate;
    private LocalTime tripStartTime;
    private LocalDate tripEndDate;
    private String tripTimezone;
    private String tripSource;
    private GuideResponse guide;
    private List<MyTripItemResponse> items;
}
