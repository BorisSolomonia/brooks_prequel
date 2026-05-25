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

    /**
     * When the beneficiary confirmed they were within the unlock radius and the
     * memory's contents became readable. NULL = locked / pending reveal — the
     * grant exists (so the memory shows on the recipient's map as a teaser) but
     * content MUST be redacted until this is set. LINK_REDEMPTION grants only
     * ever exist after a successful reveal, so they are created already-revealed.
     */
    @Column(name = "revealed_at")
    private Instant revealedAt;

    public MemoryGrant(UUID memoryId, UUID beneficiaryUserId, UUID shareId) {
        this.memoryId = memoryId;
        this.beneficiaryUserId = beneficiaryUserId;
        this.shareId = shareId;
        this.source = MemoryGrantSource.LINK_REDEMPTION;
        // Link grants are minted only on a passed distance check — revealed now.
        this.revealedAt = Instant.now();
    }

    /** Construct a DIRECT grant (no share token). Locked until reveal. */
    public static MemoryGrant direct(UUID memoryId, UUID beneficiaryUserId) {
        MemoryGrant grant = new MemoryGrant();
        grant.memoryId = memoryId;
        grant.beneficiaryUserId = beneficiaryUserId;
        grant.source = MemoryGrantSource.DIRECT;
        grant.revealedAt = null; // pending reveal — content stays hidden
        return grant;
    }

    /** True once the beneficiary has unlocked the memory by reaching it. */
    public boolean isRevealed() {
        return revealedAt != null;
    }
}
