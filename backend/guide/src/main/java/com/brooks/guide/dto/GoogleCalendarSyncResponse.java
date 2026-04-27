package com.brooks.guide.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class GoogleCalendarSyncResponse {
    private int created;
    private int updated;
    private int deleted;
    private String calendarUrl;
}
