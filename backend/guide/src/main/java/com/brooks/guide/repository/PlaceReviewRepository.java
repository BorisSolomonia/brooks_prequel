package com.brooks.guide.repository;

import com.brooks.guide.domain.PlaceReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PlaceReviewRepository extends JpaRepository<PlaceReview, UUID> {

    Optional<PlaceReview> findByPlaceIdAndUserId(UUID placeId, UUID userId);

    List<PlaceReview> findByPlaceIdOrderByCreatedAtDesc(UUID placeId);
}
