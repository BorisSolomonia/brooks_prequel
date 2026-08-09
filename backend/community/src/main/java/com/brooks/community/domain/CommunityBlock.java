package com.brooks.community.domain;

import com.brooks.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/**
 * A block: the blocker never sees the blocked contributor's content, and the blocked
 * contributor cannot interact (vote/flag) with the blocker's content. Enforced in the service.
 */
@Entity
@Table(name = "community_blocks")
@Getter
@Setter
@NoArgsConstructor
public class CommunityBlock extends BaseEntity {

    @Column(name = "blocker_id", nullable = false)
    private UUID blockerId;

    @Column(name = "blocked_id", nullable = false)
    private UUID blockedId;

    public CommunityBlock(UUID blockerId, UUID blockedId) {
        this.blockerId = blockerId;
        this.blockedId = blockedId;
    }
}
