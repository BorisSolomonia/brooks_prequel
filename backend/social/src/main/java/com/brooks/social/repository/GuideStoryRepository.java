package com.brooks.social.repository;

import com.brooks.social.domain.GuideStory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface GuideStoryRepository extends JpaRepository<GuideStory, UUID> {
    List<GuideStory> findByCreatorIdAndExpiresAtAfterOrderByCreatedAtDesc(UUID creatorId, Instant now);

    @Query("SELECT s FROM GuideStory s WHERE s.creatorId IN :creatorIds AND s.expiresAt > :now ORDER BY s.createdAt DESC")
    List<GuideStory> findActiveStoriesByCreatorIds(List<UUID> creatorIds, Instant now);

    List<GuideStory> findByCreatorIdOrderByCreatedAtDesc(UUID creatorId);

    void deleteByExpiresAtBefore(Instant now);
}
