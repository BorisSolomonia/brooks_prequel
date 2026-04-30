package com.brooks.memory.dto;

import com.brooks.memory.domain.MemoryVisibility;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
public class MemoryMapPinResponse {
    private UUID id;
    private UUID creatorId;
    private String creatorUsername;
    private String creatorDisplayName;
    private String creatorAvatarUrl;
    private String textPreview;
    private double latitude;
    private double longitude;
    private String placeLabel;
    private MemoryVisibility visibility;
    private boolean ownedByViewer;
    private boolean hasImage;
    private boolean hasAudio;
    private Instant createdAt;
}
