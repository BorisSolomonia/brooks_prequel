package com.brooks.community.domain;

import com.brooks.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * A structured answer about a place's current condition. NO free text and NO photo in v1.
 *
 * PRIVACY: {@code authorId} is server-only and MUST NEVER be serialized to clients or public
 * cards (a stable, cross-POI-linkable author id lets an attacker follow a responder). A stored
 * report is eligible by construction (the service rejects ineligible submits), so nothing about
 * the eligibility coordinates is persisted here.
 */
@Entity
@Table(name = "right_now_reports")
@Getter
@Setter
@NoArgsConstructor
public class RightNowReport extends BaseEntity {

    @Column(name = "place_id", nullable = false)
    private UUID placeId;

    @Column(name = "author_id", nullable = false)
    private UUID authorId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 10)
    private RightNowStatus status;

    @Column(name = "wait_bucket", length = 20)
    private String waitBucket;

    // Load-bearing: the feed orders by corroboration_count DESC, so this snapshot stays persisted.
    @Column(name = "corroboration_count", nullable = false)
    private int corroborationCount = 1;

    @Column(name = "shared_public", nullable = false)
    private boolean sharedPublic = false;

    @Column(name = "public_shared_at")
    private Instant publicSharedAt;

    @Column(name = "public_revoked_at")
    private Instant publicRevokedAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "hidden_at")
    private Instant hiddenAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Column(name = "removed_reason", length = 200)
    private String removedReason;

    /** Live = not expired, not moderation-hidden, not deleted. The single read-time gate. */
    public boolean isLive(Instant now) {
        return expiresAt.isAfter(now) && hiddenAt == null && deletedAt == null;
    }

    /** Public card is shown only while consented, not revoked, and still live. */
    public boolean isPublicCardLive(Instant now) {
        return sharedPublic && publicRevokedAt == null && isLive(now);
    }
}
