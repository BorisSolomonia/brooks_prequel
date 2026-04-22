package com.brooks.purchase.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
public class PurchaseResponse {
    private UUID id;
    private UUID guideId;
    private int guideVersionNumber;
    private int priceCentsPaid;
    private String currency;
    private String status;
    private Instant createdAt;
    private Instant completedAt;
    private String guideTitle;
    private String guideCoverImageUrl;
    private String guideRegion;
}
