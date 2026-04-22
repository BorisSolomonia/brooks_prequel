package com.brooks.guide.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
public class CreatorReviewResponse {
    private UUID id;
    private UUID creatorId;
    private UUID reviewerUserId;
    private String reviewerUsername;
    private String reviewerDisplayName;
    private String reviewerAvatarUrl;
    private short rating;
    private String reviewText;
    private Instant createdAt;
    private Instant updatedAt;
    private int helpfulCount;
    private int notHelpfulCount;
    private String viewerVote;
    private boolean ownedByViewer;
    private boolean canVote;
}
