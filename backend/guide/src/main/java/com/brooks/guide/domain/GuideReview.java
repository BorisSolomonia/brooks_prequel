package com.brooks.guide.domain;

import com.brooks.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "guide_reviews", uniqueConstraints = {
        @UniqueConstraint(name = "uq_guide_review_user_guide", columnNames = {"guide_id", "buyer_id"})
})
@Getter
@Setter
@NoArgsConstructor
public class GuideReview extends BaseEntity {

    @Column(name = "guide_id", nullable = false)
    private UUID guideId;

    @Column(name = "buyer_id", nullable = false)
    private UUID buyerId;

    @Column(name = "purchase_id", nullable = false)
    private UUID purchaseId;

    @Column(name = "rating", nullable = false)
    private short rating;

    @Column(name = "review_text", columnDefinition = "TEXT")
    private String reviewText;

    @Column(name = "helpful_count", nullable = false)
    private int helpfulCount;

    @Column(name = "not_helpful_count", nullable = false)
    private int notHelpfulCount;

    public GuideReview(UUID guideId, UUID buyerId, UUID purchaseId, short rating, String reviewText) {
        this.guideId = guideId;
        this.buyerId = buyerId;
        this.purchaseId = purchaseId;
        this.rating = rating;
        this.reviewText = reviewText;
    }
}
