package com.brooks.community.domain;

import com.brooks.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * One consent record per (user, purpose). Consent is explicit and un-pre-ticked: a row is
 * created only when the user actively grants, and {@code withdrawn_at} is set on revocation.
 */
@Entity
@Table(name = "community_consent")
@Getter
@Setter
@NoArgsConstructor
public class CommunityConsent extends BaseEntity {

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "purpose", nullable = false, length = 30)
    private ConsentPurpose purpose;

    @Column(name = "version", nullable = false)
    private int version = 1;

    @Column(name = "granted_at")
    private Instant grantedAt;

    @Column(name = "withdrawn_at")
    private Instant withdrawnAt;

    public CommunityConsent(UUID userId, ConsentPurpose purpose) {
        this.userId = userId;
        this.purpose = purpose;
        this.grantedAt = Instant.now();
    }

    public boolean isActive() {
        return grantedAt != null && withdrawnAt == null;
    }
}
