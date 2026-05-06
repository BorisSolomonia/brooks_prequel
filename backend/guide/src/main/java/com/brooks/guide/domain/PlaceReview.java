package com.brooks.guide.domain;

import com.brooks.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "place_reviews", uniqueConstraints = {
        @UniqueConstraint(name = "uq_place_review_user", columnNames = {"place_id", "user_id"})
})
@Getter
@Setter
@NoArgsConstructor
public class PlaceReview extends BaseEntity {

    @Column(name = "place_id", nullable = false)
    private UUID placeId;

    @Column(name = "guide_id", nullable = false)
    private UUID guideId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "rating", nullable = false)
    private short rating;

    @Column(name = "review_text", columnDefinition = "TEXT")
    private String reviewText;

    public PlaceReview(UUID placeId, UUID guideId, UUID userId, short rating, String reviewText) {
        this.placeId = placeId;
        this.guideId = guideId;
        this.userId = userId;
        this.rating = rating;
        this.reviewText = reviewText;
    }
}
