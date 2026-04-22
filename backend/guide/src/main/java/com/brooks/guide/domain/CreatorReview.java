package com.brooks.guide.domain;

import com.brooks.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "creator_reviews", uniqueConstraints = {
        @UniqueConstraint(name = "uq_creator_review_user_creator", columnNames = {"creator_id", "reviewer_id"})
})
@Getter
@Setter
@NoArgsConstructor
public class CreatorReview extends BaseEntity {

    @Column(name = "creator_id", nullable = false)
    private UUID creatorId;

    @Column(name = "reviewer_id", nullable = false)
    private UUID reviewerId;

    @Column(name = "rating", nullable = false)
    private short rating;

    @Column(name = "review_text", columnDefinition = "TEXT")
    private String reviewText;

    @Column(name = "helpful_count", nullable = false)
    private int helpfulCount;

    @Column(name = "not_helpful_count", nullable = false)
    private int notHelpfulCount;

    public CreatorReview(UUID creatorId, UUID reviewerId, short rating, String reviewText) {
        this.creatorId = creatorId;
        this.reviewerId = reviewerId;
        this.rating = rating;
        this.reviewText = reviewText;
    }
}
