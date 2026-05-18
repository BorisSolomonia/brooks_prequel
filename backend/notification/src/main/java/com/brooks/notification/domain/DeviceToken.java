package com.brooks.notification.domain;

import com.brooks.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * FCM device token registered by a Brooks user from their Android or iOS app.
 *
 * One row per (user_id, token) pair — the same user may have multiple devices.
 * FCM tokens are stable per app install but can rotate; the frontend re-POSTs
 * on every cold start and we upsert by token.
 */
@Entity
@Table(name = "device_tokens",
       uniqueConstraints = @UniqueConstraint(name = "uk_device_tokens_token", columnNames = "token"))
@Getter
@Setter
@NoArgsConstructor
public class DeviceToken extends BaseEntity {

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    /** The FCM registration token. Variable length, can be 150+ chars. */
    @Column(name = "token", nullable = false, length = 512)
    private String token;

    /** Platform the token came from — used to pick payload format. */
    @Enumerated(EnumType.STRING)
    @Column(name = "platform", nullable = false, length = 16)
    private DevicePlatform platform;

    /** Last time the client POSTed this token (cold start or refresh). */
    @Column(name = "last_seen_at", nullable = false)
    private Instant lastSeenAt;

    public DeviceToken(UUID userId, String token, DevicePlatform platform) {
        this.userId = userId;
        this.token = token;
        this.platform = platform;
        this.lastSeenAt = Instant.now();
    }
}
