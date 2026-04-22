package com.brooks.social.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
@AllArgsConstructor
public class StoryResponse {
    private UUID id;
    private UUID creatorId;
    private String creatorUsername;
    private String creatorAvatarUrl;
    private UUID guideId;
    private String guideTitle;
    private String guideRegion;
    private String guidePrimaryCity;
    private String imageUrl;
    private String promotionText;
    private Instant expiresAt;
    private int viewCount;
    private Instant createdAt;
}
