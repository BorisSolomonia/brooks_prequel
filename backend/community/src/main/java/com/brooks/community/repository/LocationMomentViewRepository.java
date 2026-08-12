package com.brooks.community.repository;

import com.brooks.community.domain.LocationMomentView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface LocationMomentViewRepository extends JpaRepository<LocationMomentView, UUID> {

    boolean existsByMomentIdAndViewerId(UUID momentId, UUID viewerId);

    long countByMomentId(UUID momentId);
}
