package com.brooks.guide.domain;

import com.brooks.common.domain.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "trip_calendar_events")
@Getter
@Setter
@NoArgsConstructor
public class TripCalendarEvent extends BaseEntity {

    @Column(name = "purchase_id", nullable = false)
    private UUID purchaseId;

    @Column(name = "trip_item_id", nullable = false)
    private UUID tripItemId;

    @Column(name = "provider", nullable = false, length = 30)
    private String provider;

    @Column(name = "external_calendar_id", nullable = false)
    private String externalCalendarId;

    @Column(name = "external_event_id", nullable = false)
    private String externalEventId;

    @Column(name = "last_synced_at")
    private Instant lastSyncedAt;

    public TripCalendarEvent(UUID purchaseId, UUID tripItemId, String provider, String externalCalendarId, String externalEventId) {
        this.purchaseId = purchaseId;
        this.tripItemId = tripItemId;
        this.provider = provider;
        this.externalCalendarId = externalCalendarId;
        this.externalEventId = externalEventId;
    }
}
