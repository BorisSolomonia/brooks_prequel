package com.brooks.community.domain;

import com.brooks.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * An open "asking" window for a place. Repeated asks for the same place dedupe into the
 * current open request (see RightNowRequestParticipant) rather than spawning new requests.
 */
@Entity
@Table(name = "right_now_requests")
@Getter
@Setter
@NoArgsConstructor
public class RightNowRequest extends BaseEntity {

    @Column(name = "place_id", nullable = false)
    private UUID placeId;

    @Column(name = "window_started_at", nullable = false)
    private Instant windowStartedAt = Instant.now();

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    public RightNowRequest(UUID placeId, Instant expiresAt) {
        this.placeId = placeId;
        this.expiresAt = expiresAt;
    }
}
