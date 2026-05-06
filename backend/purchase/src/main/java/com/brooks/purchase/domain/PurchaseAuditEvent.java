package com.brooks.purchase.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "purchase_audit_events")
@Getter
@Setter
@NoArgsConstructor
public class PurchaseAuditEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "purchase_id", nullable = false)
    private UUID purchaseId;

    @Column(name = "event_type", nullable = false, length = 50)
    private String eventType;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt = Instant.now();

    @Column(name = "payload", columnDefinition = "TEXT")
    private String payload;

    public PurchaseAuditEvent(UUID purchaseId, String eventType, String payload) {
        this.purchaseId = purchaseId;
        this.eventType = eventType;
        this.payload = payload;
    }
}
