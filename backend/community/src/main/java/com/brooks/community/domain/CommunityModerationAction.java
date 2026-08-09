package com.brooks.community.domain;

import com.brooks.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/** Immutable moderation audit trail (auto-hide, human action, etc.). */
@Entity
@Table(name = "community_moderation_actions")
@Getter
@Setter
@NoArgsConstructor
public class CommunityModerationAction extends BaseEntity {

    @Column(name = "actor_id")
    private UUID actorId;

    @Column(name = "target_report_id")
    private UUID targetReportId;

    @Column(name = "action", nullable = false, length = 40)
    private String action;

    @Column(name = "reason", length = 200)
    private String reason;

    public CommunityModerationAction(UUID actorId, UUID targetReportId, String action, String reason) {
        this.actorId = actorId;
        this.targetReportId = targetReportId;
        this.action = action;
        this.reason = reason;
    }
}
