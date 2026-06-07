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
    /**
     * True if the viewer may see contents. When false (a shared memory not yet
     * unlocked by reaching its location), textContent and media are redacted.
     */
    private boolean revealed;
    // Reply linkage: the memory this one was added to (null for top-level), and the number of
    // replies attached to it that the viewer is entitled to see.
    private UUID parentMemoryId;
    private int replyCount;
    private Instant createdAt;
    private Instant updatedAt;
}
