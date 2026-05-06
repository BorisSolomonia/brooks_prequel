package com.brooks.guide.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
public class PlaceReviewResponse {
    private UUID id;
    private UUID placeId;
    private UUID guideId;
    private UUID reviewerUserId;
    private String reviewerDisplayName;
    private String reviewerAvatarUrl;
    private short rating;
    private String reviewText;
    private Instant createdAt;
    private Instant updatedAt;
    private boolean ownedByViewer;
}
