package com.brooks.memory.domain;

import com.brooks.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "memory_reveals")
@Getter
@Setter
@NoArgsConstructor
public class MemoryReveal extends BaseEntity {

    @Column(name = "memory_id", nullable = false)
    private UUID memoryId;

    @Column(name = "share_id")
    private UUID shareId;

    @Column(name = "viewer_id", nullable = false)
    private UUID viewerId;

    @Column(name = "succeeded", nullable = false)
    private boolean succeeded;

    @Column(name = "distance_bucket", length = 40)
    private String distanceBucket;

    public MemoryReveal(UUID memoryId, UUID shareId, UUID viewerId, boolean succeeded, String distanceBucket) {
        this.memoryId = memoryId;
        this.shareId = shareId;
        this.viewerId = viewerId;
        this.succeeded = succeeded;
        this.distanceBucket = distanceBucket;
    }
}
