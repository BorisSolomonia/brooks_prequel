package com.brooks.community.domain;

import com.brooks.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/** A binary "helpful" vote. One per (report, voter); self-votes are rejected in the service. */
@Entity
@Table(name = "right_now_helpful_votes")
@Getter
@Setter
@NoArgsConstructor
public class RightNowHelpfulVote extends BaseEntity {

    @Column(name = "report_id", nullable = false)
    private UUID reportId;

    @Column(name = "voter_id", nullable = false)
    private UUID voterId;

    public RightNowHelpfulVote(UUID reportId, UUID voterId) {
        this.reportId = reportId;
        this.voterId = voterId;
    }
}
