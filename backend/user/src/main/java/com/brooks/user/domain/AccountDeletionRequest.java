package com.brooks.user.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * A pending public account-deletion request. Created when someone hits the
 * unauthenticated /account/delete page (typically because they've lost access
 * to their account). The token is generated server-side, stored here, and
 * (once email is wired up) emailed to the user. Clicking the confirmation link
 * finalises the deletion.
 *
 * <p>Until the email channel is wired, an admin queries this table and
 * processes requests manually.
 */
@Entity
@Table(name = "account_deletion_requests")
@Getter
@Setter
@NoArgsConstructor
public class AccountDeletionRequest {

    @Id
    @Column(name = "token", nullable = false, length = 64, updatable = false)
    private String token;

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @CreationTimestamp
    @Column(name = "requested_at", nullable = false, updatable = false)
    private Instant requestedAt;

    @Column(name = "expires_at", nullable = false, updatable = false)
    private Instant expiresAt;

    @Column(name = "used_at")
    private Instant usedAt;

    @Column(name = "source_ip")
    private String sourceIp;

    @Column(name = "user_agent")
    private String userAgent;

    @Column(name = "reason")
    private String reason;

    public AccountDeletionRequest(String token, UUID userId, Instant expiresAt, String sourceIp, String userAgent, String reason) {
        this.token = token;
        this.userId = userId;
        this.expiresAt = expiresAt;
        this.sourceIp = sourceIp;
        this.userAgent = userAgent;
        this.reason = reason;
    }

    public boolean isExpired() {
        return expiresAt != null && Instant.now().isAfter(expiresAt);
    }

    public boolean isUsed() {
        return usedAt != null;
    }
}
