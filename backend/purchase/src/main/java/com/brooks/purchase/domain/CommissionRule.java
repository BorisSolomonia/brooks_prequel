package com.brooks.purchase.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "commission_rules")
@Getter
@Setter
@NoArgsConstructor
public class CommissionRule {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "rule_type", nullable = false, length = 20)
    private CommissionRuleType ruleType;

    @Column(name = "region", length = 100)
    private String region;

    @Column(name = "creator_id")
    private UUID creatorId;

    @Column(name = "rate_bps", nullable = false)
    private int rateBps;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "notes")
    private String notes;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();
}
