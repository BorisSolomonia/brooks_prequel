package com.brooks.community.repository;

import com.brooks.community.domain.RightNowRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RightNowRequestRepository extends JpaRepository<RightNowRequest, UUID> {

    /** The current open (non-expired) request for a place, if any — asks dedupe into it. */
    Optional<RightNowRequest> findFirstByPlaceIdAndExpiresAtAfterOrderByExpiresAtDesc(UUID placeId, Instant now);
}
