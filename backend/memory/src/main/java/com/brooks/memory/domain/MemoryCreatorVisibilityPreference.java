package com.brooks.memory.domain;

import com.brooks.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "memory_creator_visibility_preferences",
        uniqueConstraints = @UniqueConstraint(columnNames = {"viewer_id", "creator_id"}))
@Getter
@Setter
@NoArgsConstructor
public class MemoryCreatorVisibilityPreference extends BaseEntity {

    @Column(name = "viewer_id", nullable = false)
    private UUID viewerId;

    @Column(name = "creator_id", nullable = false)
    private UUID creatorId;

    @Column(name = "hide_public_memories", nullable = false)
    private boolean hidePublicMemories = true;

    public MemoryCreatorVisibilityPreference(UUID viewerId, UUID creatorId, boolean hidePublicMemories) {
        this.viewerId = viewerId;
        this.creatorId = creatorId;
        this.hidePublicMemories = hidePublicMemories;
    }
}
