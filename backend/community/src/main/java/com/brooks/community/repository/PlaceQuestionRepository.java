package com.brooks.community.repository;

import com.brooks.community.domain.PlaceQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface PlaceQuestionRepository extends JpaRepository<PlaceQuestion, UUID> {

    /** Live (not expired) questions at a place, newest first. */
    List<PlaceQuestion> findByPlaceIdAndExpiresAtAfterOrderByCreatedAtDesc(UUID placeId, Instant now);
}
