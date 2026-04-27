package com.brooks.guide.domain;

import com.brooks.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "guide_places")
@Getter
@Setter
@NoArgsConstructor
public class GuidePlace extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "block_id", nullable = false)
    private GuideBlock block;

    @Column(name = "position", nullable = false)
    private int position;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "address", length = 500)
    private String address;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "google_place_id")
    private String googlePlaceId;

    @Column(name = "category", length = 100)
    private String category;

    @Column(name = "price_level")
    private Integer priceLevel;

    @Column(name = "suggested_start_minute")
    private Integer suggestedStartMinute;

    @Column(name = "suggested_duration_minutes")
    private Integer suggestedDurationMinutes;

    @Column(name = "is_sponsored", nullable = false)
    private boolean sponsored = false;

    @ElementCollection
    @CollectionTable(name = "guide_place_tags", joinColumns = @JoinColumn(name = "place_id"))
    @Column(name = "tag")
    @BatchSize(size = 50)
    private List<String> tags = new ArrayList<>();

    @OneToMany(mappedBy = "place", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    @BatchSize(size = 50)
    private List<GuidePlaceImage> images = new ArrayList<>();

    public GuidePlace(GuideBlock block, int position, String name) {
        this.block = block;
        this.position = position;
        this.name = name;
    }
}
