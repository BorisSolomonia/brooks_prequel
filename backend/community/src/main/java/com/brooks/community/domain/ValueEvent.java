package com.brooks.community.domain;

import com.brooks.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/**
 * DORMANT value ledger row (RIGHT_NOW_V2_DESIGN.md §7). Append-only, fraud-forensic, recorded
 * now and PAID LATER (D-6) — nothing reads these for money yet. The forensic columns exist from
 * day one because fraud (Sybils, collusion rings, dwell gaming) is only provable from signals
 * captured at emit time; a missing column is an exploit that is unauditable forever.
 *
 * GDPR: {@code subjectUserId}/{@code actorUserId} are ON DELETE SET NULL — erasing a user
 * tombstones the linkage but keeps the append-only row. PII is never a load-bearing key here.
 */
@Entity
@Table(name = "value_events")
@Getter
@Setter
@NoArgsConstructor
public class ValueEvent extends BaseEntity {

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 30)
    private ValueEventType eventType;

    @Column(name = "subject_user_id")
    private UUID subjectUserId;

    @Column(name = "source_ref")
    private UUID sourceRef;

    @Column(name = "place_id")
    private UUID placeId;

    @Column(name = "place_traffic_tier", length = 10)
    private String placeTrafficTier;

    @Column(name = "raw_dwell_ms")
    private Integer rawDwellMs;

    @Column(name = "client_reported", nullable = false)
    private boolean clientReported = true;

    @Column(name = "foreground_verified", nullable = false)
    private boolean foregroundVerified = false;

    @Column(name = "session_id", length = 80)
    private String sessionId;

    @Column(name = "epoch_id", nullable = false, length = 20)
    private String epochId;

    @Column(name = "actor_user_id")
    private UUID actorUserId;

    @Column(name = "actor_device_id", length = 120)
    private String actorDeviceId;

    @Column(name = "actor_ip_hash", length = 80)
    private String actorIpHash;

    @Column(name = "install_id", length = 120)
    private String installId;

    @Column(name = "actor_account_age_days")
    private Integer actorAccountAgeDays;

    @Column(name = "actor_trust_snapshot", length = 10)
    private String actorTrustSnapshot;

    @Column(name = "idempotency_key", nullable = false, unique = true)
    private String idempotencyKey;
}
