package com.brooks.guide.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.time.LocalDate;
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
    private LocalDate tripEndDate;
    private String tripTimezone;
    private GuideResponse guide;
    private List<MyTripItemResponse> items;
}
