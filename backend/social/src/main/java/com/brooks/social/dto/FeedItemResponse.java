package com.brooks.social.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
@AllArgsConstructor
public class FeedItemResponse {
    private UUID id;
    private String type; // "story" or "guide"
    private UUID creatorId;
    private String creatorUsername;
    private String creatorDisplayName;
    private String creatorAvatarUrl;
    private String title;
    private String imageUrl;
    private String caption;
    private Instant createdAt;
}
