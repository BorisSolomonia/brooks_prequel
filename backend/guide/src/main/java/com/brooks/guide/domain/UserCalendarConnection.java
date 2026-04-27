package com.brooks.guide.domain;

import com.brooks.common.domain.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_calendar_connections")
@Getter
@Setter
@NoArgsConstructor
public class UserCalendarConnection extends BaseEntity {

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "provider", nullable = false, length = 30)
    private String provider;

    @Column(name = "provider_account_email")
    private String providerAccountEmail;

    @Column(name = "encrypted_refresh_token", nullable = false, columnDefinition = "TEXT")
    private String encryptedRefreshToken;

    @Column(name = "access_token", columnDefinition = "TEXT")
    private String accessToken;

    @Column(name = "access_token_expires_at")
    private Instant accessTokenExpiresAt;

    @Column(name = "external_calendar_id")
    private String externalCalendarId;

    @Column(name = "connected_at", nullable = false)
    private Instant connectedAt = Instant.now();

    public UserCalendarConnection(UUID userId, String provider, String encryptedRefreshToken) {
        this.userId = userId;
        this.provider = provider;
        this.encryptedRefreshToken = encryptedRefreshToken;
    }
}
