package com.brooks.community.domain;

import com.brooks.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/**
 * One row per (moment, viewer) — the follower-engagement signal that later feeds the value
 * ledger. The viewer must be a follower of the author (enforced in service). UNIQUE(moment,
 * viewer) makes the unique-view count fraud-resistant at the storage layer.
 */
@Entity
@Table(name = "location_moment_views")
@Getter
@Setter
@NoArgsConstructor
public class LocationMomentView extends BaseEntity {

    @Column(name = "moment_id", nullable = false)
    private UUID momentId;

    @Column(name = "viewer_id", nullable = false)
    private UUID viewerId;

    @Column(name = "dwell_ms")
    private Integer dwellMs;

    @Column(name = "is_unique", nullable = false)
    private boolean unique = true;

    public LocationMomentView(UUID momentId, UUID viewerId, Integer dwellMs) {
        this.momentId = momentId;
        this.viewerId = viewerId;
        this.dwellMs = dwellMs;
    }
}
