package com.brooks.purchase.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "creator_earnings")
@Getter
@Setter
@NoArgsConstructor
public class CreatorEarning {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "purchase_id", nullable = false, unique = true)
    private UUID purchaseId;

    @Column(name = "creator_id", nullable = false)
    private UUID creatorId;

    @Column(name = "gross_amount_cents", nullable = false)
    private int grossAmountCents;

    @Column(name = "rate_bps", nullable = false)
    private int rateBps;

    @Column(name = "commission_cents", nullable = false)
    private int commissionCents;

    @Column(name = "net_amount_cents", nullable = false)
    private int netAmountCents;

    @Column(name = "rule_source", nullable = false, length = 30)
    private String ruleSource;

    @Column(name = "rule_id")
    private UUID ruleId;

    @Column(name = "payout_status", nullable = false, length = 20)
    private String payoutStatus = "PENDING";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
