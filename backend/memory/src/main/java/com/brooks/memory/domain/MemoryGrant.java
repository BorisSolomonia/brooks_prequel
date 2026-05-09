package com.brooks.memory.domain;

import com.brooks.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "memory_grants")
@Getter
@Setter
@NoArgsConstructor
public class MemoryGrant extends BaseEntity {

    @Column(name = "memory_id", nullable = false)
    private UUID memoryId;

    @Column(name = "beneficiary_user_id", nullable = false)
    private UUID beneficiaryUserId;

    @Column(name = "share_id", nullable = false)
    private UUID shareId;

    @Column(name = "granted_at", nullable = false)
    private Instant grantedAt = Instant.now();

    @Column(name = "removed_at")
    private Instant removedAt;

    public MemoryGrant(UUID memoryId, UUID beneficiaryUserId, UUID shareId) {
        this.memoryId = memoryId;
        this.beneficiaryUserId = beneficiaryUserId;
        this.shareId = shareId;
    }
}
