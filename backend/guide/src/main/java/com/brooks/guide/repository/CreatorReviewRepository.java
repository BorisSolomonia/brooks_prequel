package com.brooks.guide.repository;

import com.brooks.guide.domain.CreatorReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface CreatorReviewRepository extends JpaRepository<CreatorReview, UUID> {

    Optional<CreatorReview> findByCreatorIdAndReviewerId(UUID creatorId, UUID reviewerId);

    Page<CreatorReview> findByCreatorIdOrderByCreatedAtDesc(UUID creatorId, Pageable pageable);

    @Query("SELECT COUNT(r) FROM CreatorReview r WHERE r.creatorId = :creatorId")
    long countByCreatorId(UUID creatorId);

    @Query("SELECT COALESCE(AVG(CAST(r.rating AS double)), 0.0) FROM CreatorReview r WHERE r.creatorId = :creatorId")
    double averageRatingByCreatorId(UUID creatorId);
}
