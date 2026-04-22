package com.brooks.guide.domain;

import com.brooks.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "guide_purchases")
@Getter
@Setter
@NoArgsConstructor
public class GuidePurchase extends BaseEntity {

    @Column(name = "buyer_id", nullable = false)
    private UUID buyerId;

    @Column(name = "guide_id", nullable = false)
    private UUID guideId;

    @Column(name = "guide_version_id", nullable = false)
    private UUID guideVersionId;

    @Column(name = "guide_version_number", nullable = false)
    private int guideVersionNumber;

    @Column(name = "provider", nullable = false, length = 30)
    private String provider;

    @Column(name = "provider_session_id")
    private String providerSessionId;

    @Column(name = "amount_cents", nullable = false)
    private int amountCents;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private GuidePurchaseStatus status = GuidePurchaseStatus.PENDING;

    @Column(name = "trip_start_date")
    private LocalDate tripStartDate;

    @Column(name = "trip_end_date")
    private LocalDate tripEndDate;

    @Column(name = "trip_timezone", length = 80)
    private String tripTimezone;

    @OneToMany(mappedBy = "purchase", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("dayNumber ASC, blockPosition ASC, placePosition ASC")
    private List<GuideTripItem> items = new ArrayList<>();

    public GuidePurchase(UUID buyerId, UUID guideId, UUID guideVersionId, int guideVersionNumber, String provider, int amountCents, String currency) {
        this.buyerId = buyerId;
        this.guideId = guideId;
        this.guideVersionId = guideVersionId;
        this.guideVersionNumber = guideVersionNumber;
        this.provider = provider;
        this.amountCents = amountCents;
        this.currency = currency;
    }
}
