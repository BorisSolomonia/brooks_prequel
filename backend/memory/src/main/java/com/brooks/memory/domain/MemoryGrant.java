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

    /**
     * Nullable: only set for LINK_REDEMPTION grants. DIRECT grants are
     * created without a share token (memory creator picks a follower
     * in-app), so share_id is null for them.
     */
    @Column(name = "share_id")
    private UUID shareId;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 32)
    private MemoryGrantSource source = MemoryGrantSource.LINK_REDEMPTION;

    @Column(name = "granted_at", nullable = false)
    private Instant grantedAt = Instant.now();

    @Column(name = "removed_at")
    private Instant removedAt;

    public MemoryGrant(UUID memoryId, UUID beneficiaryUserId, UUID shareId) {
        this.memoryId = memoryId;
        this.beneficiaryUserId = beneficiaryUserId;
        this.shareId = shareId;
        this.source = MemoryGrantSource.LINK_REDEMPTION;
    }

    /** Construct a DIRECT grant (no share token). */
    public static MemoryGrant direct(UUID memoryId, UUID beneficiaryUserId) {
        MemoryGrant grant = new MemoryGrant();
        grant.memoryId = memoryId;
        grant.beneficiaryUserId = beneficiaryUserId;
        grant.source = MemoryGrantSource.DIRECT;
        return grant;
    }
}
