package com.brooks.memory.dto;

import com.brooks.memory.domain.MemoryVisibility;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Getter
@Builder
public class MemoryResponse {
    private UUID id;
    private UUID creatorId;
    private String creatorUsername;
    private String creatorDisplayName;
    private String creatorAvatarUrl;
    private String textContent;
    private double latitude;
    private double longitude;
    private String placeLabel;
    private MemoryVisibility visibility;
    private Instant expiresAt;
    private List<MemoryMediaResponse> media;
    private boolean ownedByViewer;
    private Instant createdAt;
    private Instant updatedAt;
}
