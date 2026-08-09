package com.brooks.community.domain;

import com.brooks.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/**
 * A distinct asker on an open request. The demand counter is COUNT(DISTINCT asker) over these
 * rows (surfaced bucketed), so a single user asking repeatedly cannot inflate it.
 */
@Entity
@Table(name = "right_now_request_participants")
@Getter
@Setter
@NoArgsConstructor
public class RightNowRequestParticipant extends BaseEntity {

    @Column(name = "request_id", nullable = false)
    private UUID requestId;

    @Column(name = "asker_id", nullable = false)
    private UUID askerId;

    public RightNowRequestParticipant(UUID requestId, UUID askerId) {
        this.requestId = requestId;
        this.askerId = askerId;
    }
}
