package com.brooks.guide.repository;

import com.brooks.guide.domain.SavedGuide;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Collection;
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

    /** Batch per-guide save counts so list mappers avoid one query per guide (BOR-59). */
    interface GuideCount {
        UUID getGuideId();
        long getTotal();
    }

    @Query("SELECT s.guideId AS guideId, COUNT(s) AS total FROM SavedGuide s " +
           "WHERE s.guideId IN :guideIds AND s.createdAt > :since GROUP BY s.guideId")
    List<GuideCount> countByGuideIdsAndCreatedAtAfter(Collection<UUID> guideIds, Instant since);
}
