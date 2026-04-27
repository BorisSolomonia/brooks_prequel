package com.brooks.guide.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
public class CalendarLateEventResponse {
    private UUID itemId;
    private String placeName;
    private Instant scheduledStart;
    private String localStartTime;
}
