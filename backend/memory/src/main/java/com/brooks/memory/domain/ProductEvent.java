package com.brooks.memory.domain;

import com.brooks.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "product_events")
@Getter
@Setter
@NoArgsConstructor
public class ProductEvent extends BaseEntity {

    @Column(name = "event_name", nullable = false, length = 80)
    private String eventName;

    @Column(name = "actor_id")
    private UUID actorId;

    @Column(name = "memory_id")
    private UUID memoryId;

    @Column(name = "share_token", length = 80)
    private String shareToken;

    @Column(name = "source", length = 80)
    private String source;

    public ProductEvent(String eventName, UUID actorId, UUID memoryId, String shareToken, String source) {
        this.eventName = eventName;
        this.actorId = actorId;
        this.memoryId = memoryId;
        this.shareToken = shareToken;
        this.source = source;
    }
}
