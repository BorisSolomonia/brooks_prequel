package com.brooks.community.repository;

import com.brooks.community.domain.ContributorTrust;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ContributorTrustRepository extends JpaRepository<ContributorTrust, UUID> {

    Optional<ContributorTrust> findByUserId(UUID userId);

    /** Batch trust lookup for a feed's authors — avoids an N+1 across reports. */
    List<ContributorTrust> findByUserIdIn(Collection<UUID> userIds);
}
