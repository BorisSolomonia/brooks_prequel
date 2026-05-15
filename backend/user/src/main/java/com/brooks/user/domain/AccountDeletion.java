package com.brooks.user.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * Audit row for a completed account deletion. Survives the 30-day backup purge
 * so we can prove compliance with deletion requests to regulators.
 * Plaintext PII is NOT stored — email is reduced to a sha256 fingerprint for
 * de-duplication only.
 */
@Entity
@Table(name = "account_deletions")
@Getter
@Setter
@NoArgsConstructor
public class AccountDeletion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false, updatable = false)
    private Long id;

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Column(name = "hashed_email", nullable = false, length = 64, updatable = false)
    private String hashedEmail;

    @Column(name = "reason")
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 16, updatable = false)
    private AccountDeletionSource source;

    @CreationTimestamp
    @Column(name = "requested_at", nullable = false, updatable = false)
    private Instant requestedAt;

    @Column(name = "hard_deleted_at")
    private Instant hardDeletedAt;

    public AccountDeletion(UUID userId, String hashedEmail, String reason, AccountDeletionSource source) {
        this.userId = userId;
        this.hashedEmail = hashedEmail;
        this.reason = reason;
        this.source = source;
    }
}
