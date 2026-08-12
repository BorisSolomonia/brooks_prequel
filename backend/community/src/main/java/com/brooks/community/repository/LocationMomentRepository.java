package com.brooks.community.repository;

import com.brooks.community.domain.LocationMoment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface LocationMomentRepository extends JpaRepository<LocationMoment, UUID> {

    /** Live+revealed moments at a place authored by anyone in {@code authorIds} (the viewer's follows). */
    List<LocationMoment> findByPlaceIdAndAuthorIdInAndVisibleAtBeforeAndExpiresAtAfterAndTakenDownAtIsNullAndGoGhostFalseOrderByCreatedAtDesc(
            UUID placeId, Collection<UUID> authorIds, Instant visibleBefore, Instant expiresAfter);

    /** The viewer's story tray: live+revealed moments from everyone they follow, newest first. */
    List<LocationMoment> findByAuthorIdInAndVisibleAtBeforeAndExpiresAtAfterAndTakenDownAtIsNullAndGoGhostFalseOrderByCreatedAtDesc(
            Collection<UUID> authorIds, Instant visibleBefore, Instant expiresAfter);

    /** Rate-limit input: how many moments this author posted recently. */
    long countByAuthorIdAndCreatedAtAfter(UUID authorId, Instant since);
}
