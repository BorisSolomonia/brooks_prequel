package com.brooks.guide.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
public class MyTripItemUpdateRequest {
    private UUID placeId;
    private Instant scheduledStart;
    private Instant scheduledEnd;
    private boolean skipped;
}
