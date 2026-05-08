package com.brooks.purchase.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "purchases")
@Getter
@Setter
@NoArgsConstructor
public class Purchase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "buyer_id", nullable = false)
    private UUID buyerId;

    @Column(name = "guide_id", nullable = false)
    private UUID guideId;

    @Column(name = "guide_version_number", nullable = false)
    private int guideVersionNumber;

    @Column(name = "price_cents_paid", nullable = false)
    private int priceCentsPaid;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency = "GEL";

    @Column(name = "platform_fee_cents", nullable = false)
    private int platformFeeCents = 0;

    @Column(name = "commission_rate_bps", nullable = false)
    private int commissionRateBps = 2000;

    @Column(name = "bog_order_id", nullable = false, unique = true)
    private String bogOrderId;

    @Column(name = "bog_payment_hash")
    private String bogPaymentHash;

    @Column(name = "bog_ipay_payment_id")
    private String bogIpayPaymentId;

    @Column(name = "bog_transaction_id")
    private String bogTransactionId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private PurchaseStatus status = PurchaseStatus.PENDING;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "terms_accepted_at")
    private Instant termsAcceptedAt;

    // Denormalised display fields — populated on checkout creation so the purchase list
    // view doesn't have to fetch + parse the full guide_versions.snapshot JSON per row.
    // The snapshot remains authoritative for full-detail buyer view.
    @Column(name = "guide_title_at_purchase")
    private String guideTitleAtPurchase;

    @Column(name = "cover_image_url_at_purchase")
    private String coverImageUrlAtPurchase;

    @Column(name = "region_at_purchase")
    private String regionAtPurchase;
}
