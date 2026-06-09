package com.brooks.guide.repository;

import com.brooks.guide.domain.SavedGuide;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.time.Instant;
import java.util.UUID;

@Repository
public interface SavedGuideRepository extends JpaRepository<SavedGuide, UUID> {

    boolean existsByUserIdAndGuideId(UUID userId, UUID guideId);

    Optional<SavedGuide> findByUserIdAndGuideId(UUID userId, UUID guideId);

    List<SavedGuide> findByUserIdOrderByCreatedAtDesc(UUID userId);

    long countByGuideIdAndCreatedAtAfter(UUID guideId, Instant createdAt);

    /** Batch variant for list views — one grouped query instead of one query per guide. */
    @org.springframework.data.jpa.repository.Query("""
        SELECT s.guideId AS guideId, COUNT(s) AS total
        FROM SavedGuide s
        WHERE s.guideId IN :guideIds
          AND s.createdAt > :createdAt
        GROUP BY s.guideId
        """)
    List<GuidePurchaseRepository.GuideCountRow> countByGuideIdsAndCreatedAtAfter(
            java.util.Collection<UUID> guideIds, Instant createdAt);
}
