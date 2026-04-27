package com.brooks.guide.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class GoogleCalendarConnectRequest {
    private String code;
    private String redirectUri;
}
