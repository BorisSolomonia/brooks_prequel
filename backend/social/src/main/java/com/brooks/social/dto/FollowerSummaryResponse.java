package com.brooks.social.dto;

import lombok.Builder;
import lombok.Value;

import java.util.UUID;

@Value
@Builder
public class FollowerSummaryResponse {
    UUID userId;
    String username;
    String displayName;
    String avatarUrl;
}
