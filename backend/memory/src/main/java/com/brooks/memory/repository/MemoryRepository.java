package com.brooks.memory.repository;

import com.brooks.memory.domain.Memory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MemoryRepository extends JpaRepository<Memory, UUID> {

    @Query(value = """
        SELECT m.*
        FROM memories m
        WHERE m.deleted_at IS NULL
          AND (m.expires_at IS NULL OR m.expires_at > NOW())
          AND m.latitude BETWEEN :south AND :north
          AND (
            (:west <= :east AND m.longitude BETWEEN :west AND :east)
            OR (:west > :east AND (m.longitude >= :west OR m.longitude <= :east))
          )
          AND (
            m.creator_id = :viewerId
            OR (
              m.visibility = 'FOLLOWERS_PUBLIC'
              AND EXISTS (
                SELECT 1 FROM follows f
                WHERE f.follower_id = :viewerId AND f.following_id = m.creator_id
              )
              AND NOT EXISTS (
                SELECT 1 FROM memory_creator_visibility_preferences p
                WHERE p.viewer_id = :viewerId
                  AND p.creator_id = m.creator_id
                  AND p.hide_public_memories = TRUE
              )
            )
          )
        ORDER BY m.created_at DESC
        LIMIT 250
        """, nativeQuery = true)
    List<Memory> findVisibleMapMemories(
            @Param("viewerId") UUID viewerId,
            @Param("north") double north,
            @Param("south") double south,
            @Param("east") double east,
            @Param("west") double west);

    long countByCreatorIdAndDeletedAtIsNullAndCreatedAtAfter(UUID creatorId, java.time.Instant createdAt);
}
