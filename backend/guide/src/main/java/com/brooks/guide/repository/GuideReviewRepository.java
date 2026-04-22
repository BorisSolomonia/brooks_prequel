package com.brooks.guide.repository;

import com.brooks.guide.domain.GuideReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface GuideReviewRepository extends JpaRepository<GuideReview, UUID> {

    Optional<GuideReview> findByPurchaseId(UUID purchaseId);

    Optional<GuideReview> findByGuideIdAndBuyerId(UUID guideId, UUID buyerId);

    Page<GuideReview> findByGuideIdOrderByCreatedAtDesc(UUID guideId, Pageable pageable);

    @Query("SELECT COUNT(r) FROM GuideReview r WHERE r.guideId = :guideId")
    long countByGuideId(UUID guideId);

    @Query("SELECT COALESCE(AVG(CAST(r.rating AS double)), 0.0) FROM GuideReview r WHERE r.guideId = :guideId")
    double averageRatingByGuideId(UUID guideId);
}
