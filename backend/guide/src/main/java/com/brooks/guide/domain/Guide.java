package com.brooks.guide.domain;

import com.brooks.common.domain.BaseEntity;
import jakarta.persistence.*;
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
    private int priceCents = 0;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency = "USD";

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private GuideStatus status = GuideStatus.DRAFT;

    @Column(name = "version_number", nullable = false)
    private int versionNumber = 0;

    @Column(name = "day_count", nullable = false)
    private int dayCount = 0;

    @Column(name = "place_count", nullable = false)
    private int placeCount = 0;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    @Column(name = "sale_price_cents")
    private Integer salePriceCents;

    @Column(name = "sale_ends_at")
    private Instant saleEndsAt;

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
}
