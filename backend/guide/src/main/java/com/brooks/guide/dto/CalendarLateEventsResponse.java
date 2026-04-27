package com.brooks.guide.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class CalendarLateEventsResponse {
    private String code;
    private String message;
    private List<CalendarLateEventResponse> lateEvents;
}
