package com.brooks.memory.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;

@Getter
@Builder
public class MemoryShareTeaserResponse {
    private String token;
    private String senderName;
    private String senderAvatarUrl;
    private String placeLabel;
    private double approximateLatitude;
    private double approximateLongitude;
    private boolean available;
    private String unavailableReason;
    private Instant createdAt;
}
