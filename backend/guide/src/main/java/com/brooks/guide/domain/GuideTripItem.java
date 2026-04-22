package com.brooks.guide.domain;

import com.brooks.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "guide_trip_items")
@Getter
@Setter
@NoArgsConstructor
public class GuideTripItem extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_id", nullable = false)
    private GuidePurchase purchase;

    @Column(name = "place_id", nullable = false)
    private UUID placeId;

    @Column(name = "day_number", nullable = false)
    private int dayNumber;

    @Column(name = "block_position", nullable = false)
    private int blockPosition;

    @Column(name = "place_position", nullable = false)
    private int placePosition;

    @Column(name = "block_title", length = 200)
    private String blockTitle;

    @Column(name = "block_category", length = 30, nullable = false)
    private String blockCategory = "ACTIVITY";

    @Column(name = "place_name", nullable = false, length = 200)
    private String placeName;

    @Column(name = "place_address", length = 500)
    private String placeAddress;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "suggested_start_minute")
    private Integer suggestedStartMinute;

    @Column(name = "suggested_duration_minutes")
    private Integer suggestedDurationMinutes;

    @Column(name = "scheduled_start")
    private Instant scheduledStart;

    @Column(name = "scheduled_end")
    private Instant scheduledEnd;

    @Column(name = "skipped", nullable = false)
    private boolean skipped;

    @Column(name = "visited", nullable = false)
    private boolean visited;

    @Column(name = "visited_at")
    private Instant visitedAt;

    public GuideTripItem(GuidePurchase purchase, UUID placeId, int dayNumber, int blockPosition, int placePosition, String placeName) {
        this.purchase = purchase;
        this.placeId = placeId;
        this.dayNumber = dayNumber;
        this.blockPosition = blockPosition;
        this.placePosition = placePosition;
        this.placeName = placeName;
    }
}
