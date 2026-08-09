package com.brooks.community.domain;

import com.brooks.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * Derived, anti-Sybil trust for a contributor. Never exposed as a number — only the coarse
 * {@link TrustTier} is ever shown (a per-report count would itself de-anonymise a responder),
 * and only above the k-anonymity threshold.
 */
@Entity
@Table(name = "contributor_trust")
@Getter
@Setter
@NoArgsConstructor
public class ContributorTrust extends BaseEntity {

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "helpful_weighted", nullable = false)
    private double helpfulWeighted = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "tier", nullable = false, length = 10)
    private TrustTier tier = TrustTier.NONE;

    @Column(name = "recomputed_at")
    private Instant recomputedAt;

    public ContributorTrust(UUID userId) {
        this.userId = userId;
    }
}
