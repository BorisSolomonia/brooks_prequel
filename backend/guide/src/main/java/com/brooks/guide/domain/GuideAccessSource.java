package com.brooks.guide.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.Instant;
import java.util.UUID;

/** Financial provenance of an entitlement; several purchases may support one trip. */
@Entity
@Table(name = "guide_access_sources")
@Getter
@Setter
@NoArgsConstructor
public class GuideAccessSource {
    @Id
    @Column(name = "financial_purchase_id")
    private UUID financialPurchaseId;
    @Column(name = "guide_purchase_id", nullable = false)
    private UUID guidePurchaseId;
    @Column(name = "revoked_at")
    private Instant revokedAt;

    public GuideAccessSource(UUID financialPurchaseId, UUID guidePurchaseId) {
        this.financialPurchaseId = financialPurchaseId;
        this.guidePurchaseId = guidePurchaseId;
    }
}
