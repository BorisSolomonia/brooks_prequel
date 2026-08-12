package com.brooks.community.domain;

import com.brooks.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/**
 * Close-followers narrowing for a CLOSE_FOLLOWERS moment (Q3, schema-ready, UI deferred). Only
 * users listed here may see the moment. Empty at launch — FOLLOWERS visibility ignores this table.
 */
@Entity
@Table(name = "moment_audience")
@Getter
@Setter
@NoArgsConstructor
public class MomentAudience extends BaseEntity {

    @Column(name = "moment_id", nullable = false)
    private UUID momentId;

    @Column(name = "allowed_user_id", nullable = false)
    private UUID allowedUserId;

    public MomentAudience(UUID momentId, UUID allowedUserId) {
        this.momentId = momentId;
        this.allowedUserId = allowedUserId;
    }
}
