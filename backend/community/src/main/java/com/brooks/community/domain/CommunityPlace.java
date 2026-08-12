package com.brooks.community.domain;

import com.brooks.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * A curated public place a Right Now request can target. Requests may ONLY reference a
 * row here — there is no free-form coordinate/address path — which makes targeting a
 * private home or an individual structurally impossible.
 */
@Entity
@Table(name = "community_places")
@Getter
@Setter
@NoArgsConstructor
public class CommunityPlace extends BaseEntity {

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "category", nullable = false, length = 60)
    private String category;

    @Enumerated(EnumType.STRING)
    @Column(name = "footfall_class", nullable = false, length = 10)
    private FootfallClass footfallClass = FootfallClass.MED;

    /** The PLACE's public coordinate — never a person's. Used only to range-check eligibility. */
    @Column(name = "latitude", nullable = false)
    private double latitude;

    @Column(name = "longitude", nullable = false)
    private double longitude;

    @Column(name = "radius_meters", nullable = false)
    private int radiusMeters = 50;

    @Column(name = "public_card_allowed", nullable = false)
    private boolean publicCardAllowed = false;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "excluded_reason", length = 200)
    private String excludedReason;

    @Column(name = "city", length = 120)
    private String city;

    @Column(name = "country", length = 80)
    private String country;

    /**
     * Q4: sensitive/kid-related POIs (schools, kindergartens…). {@code storiesExcluded} is the
     * launch-off enforcement toggle; when true, Moments cannot be posted here. Off at launch.
     */
    @Column(name = "stories_excluded", nullable = false)
    private boolean storiesExcluded = false;

    @Column(name = "sensitive_category", length = 30)
    private String sensitiveCategory;

    /** Eligible for Right Now v1 only if active and not low-footfall. */
    public boolean eligibleForV1() {
        return active && footfallClass != FootfallClass.LOW;
    }

    /** A place accepts Moments if it's active and not flagged as a sensitive/kid-related POI. */
    public boolean acceptsMoments() {
        return active && !storiesExcluded;
    }
}
