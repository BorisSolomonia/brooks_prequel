package com.brooks.guide.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CalendarConnectionStatusResponse {
    private boolean googleConnected;
    private String googleAccountEmail;
    private String googleCalendarId;
}
