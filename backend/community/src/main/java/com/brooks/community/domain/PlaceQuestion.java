package com.brooks.community.domain;

import com.brooks.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * A question about a place (preset or free text). Asking is REMOTE-allowed (D-2) — no presence.
 * PRIVACY: {@code askerId} is server-only and MUST NEVER be serialized — questions are anonymous.
 * Free-text bodies are person-targeting-guarded before persistence (§9.1).
 */
@Entity
@Table(name = "place_questions")
@Getter
@Setter
@NoArgsConstructor
public class PlaceQuestion extends BaseEntity {

    @Column(name = "place_id", nullable = false)
    private UUID placeId;

    @Column(name = "asker_id", nullable = false)
    private UUID askerId;

    @Column(name = "body_text", length = 140)
    private String bodyText;

    @Column(name = "preset_key", length = 40)
    private String presetKey;

    @Column(name = "is_free_text", nullable = false)
    private boolean freeText = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 12)
    private QuestionStatus status = QuestionStatus.OPEN;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    public boolean isLive(Instant now) {
        return expiresAt.isAfter(now) && status != QuestionStatus.EXPIRED;
    }
}
