package com.brooks.purchase.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "commission_promotions")
@Getter
@Setter
@NoArgsConstructor
public class CommissionPromotion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "description")
    private String description;

    @Column(name = "rate_bps", nullable = false)
    private int rateBps;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false, length = 20)
    private PromotionTargetType targetType;

    @Column(name = "region", length = 100)
    private String region;

    @Column(name = "starts_at", nullable = false)
    private Instant startsAt;

    @Column(name = "ends_at", nullable = false)
    private Instant endsAt;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @ElementCollection
    @CollectionTable(
            name = "commission_promotion_creators",
            joinColumns = @JoinColumn(name = "promotion_id")
    )
    @Column(name = "creator_id")
    private Set<UUID> creatorIds = new HashSet<>();
}
