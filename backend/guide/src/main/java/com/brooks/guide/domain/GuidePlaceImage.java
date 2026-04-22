package com.brooks.guide.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "guide_place_images")
@Getter
@Setter
@NoArgsConstructor
public class GuidePlaceImage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "place_id", nullable = false)
    private GuidePlace place;

    @Column(name = "image_url", nullable = false, length = 500)
    private String imageUrl;

    @Column(name = "caption", length = 200)
    private String caption;

    @Column(name = "position", nullable = false)
    private int position = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public GuidePlaceImage(GuidePlace place, String imageUrl, int position) {
        this.place = place;
        this.imageUrl = imageUrl;
        this.position = position;
    }
}
