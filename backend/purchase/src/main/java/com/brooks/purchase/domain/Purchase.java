package com.brooks.purchase.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

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
    private String currency = com.brooks.common.util.BusinessConstants.CURRENCY_GEL;

    @Column(name = "platform_fee_cents", nullable = false)
    private int platformFeeCents = 0;

    @Column(name = "commission_rate_bps", nullable = false)
    private int commissionRateBps = 2000;

    @Column(name = "bog_order_id", nullable = false, unique = true)
    private String bogOrderId;

    // Our merchant-side id sent to BOG as external_order_id and echoed back in the redirect URL
    // (shop_order_id). Used to locate the purchase from the post-payment return page, since BOG's
    // own id (bog_order_id) isn't known when the redirect URLs are built. Null for free checkouts.
    @Column(name = "external_order_id", unique = true)
    private String externalOrderId;

    @Column(name = "bog_payment_hash")
    private String bogPaymentHash;

    @Column(name = "bog_ipay_payment_id")
    private String bogIpayPaymentId;

    @Column(name = "bog_transaction_id")
    private String bogTransactionId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private PurchaseStatus status = PurchaseStatus.PENDING;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

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
