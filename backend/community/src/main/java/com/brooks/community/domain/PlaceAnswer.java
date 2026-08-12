package com.brooks.community.domain;

import com.brooks.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * An anonymous answer to a place question, submitted present-only (§9.2). PRIVACY:
 * {@code responderId} is server-only (moderation + dormant-ledger attribution) and MUST NEVER be
 * serialized to clients — answers carry no identity, only coarse trust/corroboration signals.
 */
@Entity
@Table(name = "place_answers")
@Getter
@Setter
@NoArgsConstructor
public class PlaceAnswer extends BaseEntity {

    @Column(name = "question_id", nullable = false)
    private UUID questionId;

    @Column(name = "responder_id", nullable = false)
    private UUID responderId;

    @Column(name = "body_text", length = 280)
    private String bodyText;

    @Column(name = "status_chip", length = 20)
    private String statusChip;

    @Column(name = "presence_verified", nullable = false)
    private boolean presenceVerified = true;

    @Column(name = "corroboration_count", nullable = false)
    private int corroborationCount = 1;

    @Column(name = "helpful_count", nullable = false)
    private int helpfulCount = 0;

    @Column(name = "hidden_at")
    private Instant hiddenAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Column(name = "removed_reason", length = 200)
    private String removedReason;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    public boolean isLive(Instant now) {
        return expiresAt.isAfter(now) && hiddenAt == null && deletedAt == null;
    }
}
