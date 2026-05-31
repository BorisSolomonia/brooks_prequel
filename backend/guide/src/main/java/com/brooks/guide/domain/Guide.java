package com.brooks.guide.domain;

import com.brooks.common.domain.BaseEntity;
import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "guides")
@Getter
@Setter
@NoArgsConstructor
public class Guide extends BaseEntity {

    @Column(name = "creator_id", nullable = false)
    private UUID creatorId;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "cover_image_url", length = 500)
    private String coverImageUrl;

    @Column(name = "region", length = 100)
    private String region;

    @Column(name = "primary_city", length = 100)
    private String primaryCity;

    @Column(name = "country", length = 100)
    private String country;

    @Column(name = "timezone", length = 80)
    private String timezone;

    @Column(name = "price_cents", nullable = false)
    @Min(0)
    private int priceCents = 0;

    // GEL by default — Brooks's only payment processor (BOG iPay) accepts
    // GEL exclusively, and PurchaseService refuses to start a checkout
    // session for any non-GEL guide. Earlier USD default was a leftover
    // from a generic template; switching to GEL means new guides are
    // immediately purchasable. V53 backfills existing USD rows.
    @Column(name = "currency", nullable = false, length = 3)
    private String currency = "GEL";

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private GuideStatus status = GuideStatus.DRAFT;

    // Pricing model — drives the checkout path in GuidePurchaseService.
    // Default PAID preserves the existing iPay flow for all guides
    // created before V54. Creators opt into a free mode explicitly.
    @Enumerated(EnumType.STRING)
    @Column(name = "pricing_mode", nullable = false, length = 32)
    private GuidePricingMode pricingMode = GuidePricingMode.PAID;

    @Column(name = "version_number", nullable = false)
    private int versionNumber = 0;

    @Column(name = "day_count", nullable = false)
    private int dayCount = 0;

    @Column(name = "place_count", nullable = false)
    private int placeCount = 0;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    // Derived from discountPercent on every save (kept so display/response code is unchanged).
    @Column(name = "sale_price_cents")
    @Min(0)
    private Integer salePriceCents;

    @Column(name = "sale_ends_at")
    private Instant saleEndsAt;

    // Source of truth for discounts (0-95). Currency-agnostic and auto-tracks base-price edits.
    @Column(name = "discount_percent")
    @Min(0)
    private Integer discountPercent;

    @Column(name = "best_season_start_month")
    @JdbcTypeCode(SqlTypes.SMALLINT)
    private Integer bestSeasonStartMonth;

    @Column(name = "best_season_end_month")
    @JdbcTypeCode(SqlTypes.SMALLINT)
    private Integer bestSeasonEndMonth;

    @Column(name = "best_season_label", length = 60)
    private String bestSeasonLabel;

    @Column(name = "traveler_stage", length = 20)
    private String travelerStage;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @ElementCollection
    @CollectionTable(name = "guide_personas", joinColumns = @JoinColumn(name = "guide_id"))
    @Column(name = "persona", length = 30)
    private List<String> personas = new ArrayList<>();

    @OneToMany(mappedBy = "guide", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("dayNumber ASC")
    @BatchSize(size = 50)
    private List<GuideDay> days = new ArrayList<>();

    @OneToMany(mappedBy = "guide", cascade = CascadeType.ALL, orphanRemoval = true)
    @BatchSize(size = 50)
    private List<GuideTag> tags = new ArrayList<>();

    public Guide(UUID creatorId, String title) {
        this.creatorId = creatorId;
        this.title = title;
    }

    /**
     * Price the buyer actually pays right now: salePriceCents if a sale is configured and
     * either has no end date or the end date is in the future, otherwise priceCents.
     * Centralised here so the price-display invariant lives next to the data, not in
     * services or DTOs.
     */
    public int effectivePrice() {
        return effectivePrice(Instant.now());
    }

    int effectivePrice(Instant now) {
        if (salePriceCents != null && (saleEndsAt == null || saleEndsAt.isAfter(now))) {
            return salePriceCents;
        }
        return priceCents;
    }

    /**
     * Recompute the derived {@code salePriceCents} from {@code discountPercent} + {@code priceCents}.
     * Call after any change to price or discount. A discount thus always tracks the current base
     * price. Clamps the percent to 1-95; outside that (or null/0) clears the sale.
     */
    public void recomputeSalePrice() {
        if (discountPercent != null && discountPercent <= 0) {
            this.discountPercent = null; // 0/negative means "no discount"
        }
        if (discountPercent == null) {
            this.salePriceCents = null;
            this.saleEndsAt = null;
            return;
        }
        int pct = Math.min(95, discountPercent);
        this.discountPercent = pct;
        this.salePriceCents = priceCents > 0 ? Math.max(1, priceCents - Math.round(priceCents * pct / 100f)) : null;
    }
}
