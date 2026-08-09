package com.brooks.community.repository;

import com.brooks.community.domain.CommunityPlace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CommunityPlaceRepository extends JpaRepository<CommunityPlace, UUID> {

    /**
     * Active places inside a map viewport (bounding box, antimeridian-safe — mirrors the
     * memory map query). LOW-footfall exclusion is applied in the service via eligibleForV1().
     */
    @Query("""
        SELECT p FROM CommunityPlace p
        WHERE p.active = true
          AND p.latitude BETWEEN :south AND :north
          AND ((:west <= :east AND p.longitude BETWEEN :west AND :east)
               OR (:west > :east AND (p.longitude >= :west OR p.longitude <= :east)))
        ORDER BY p.name ASC
        """)
    List<CommunityPlace> findActiveInViewport(
            @Param("north") double north,
            @Param("south") double south,
            @Param("east") double east,
            @Param("west") double west);
}
