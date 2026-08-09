package com.brooks.community.domain;

import com.brooks.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/** A viewer flagging a report. One per (report, reporter). Critical categories auto-hide. */
@Entity
@Table(name = "right_now_report_flags")
@Getter
@Setter
@NoArgsConstructor
public class RightNowReportFlag extends BaseEntity {

    @Column(name = "report_id", nullable = false)
    private UUID reportId;

    @Column(name = "reporter_id", nullable = false)
    private UUID reporterId;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 20)
    private FlagCategory category;

    @Enumerated(EnumType.STRING)
    @Column(name = "state", nullable = false, length = 20)
    private FlagState state = FlagState.OPEN;

    public RightNowReportFlag(UUID reportId, UUID reporterId, FlagCategory category) {
        this.reportId = reportId;
        this.reporterId = reporterId;
        this.category = category;
    }
}
