package com.brooks.memory.repository;

import com.brooks.memory.domain.Memory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface MemoryRepository extends JpaRepository<Memory, UUID> {

    // Reply linkage — direct (one-level) children of a memory, oldest first (thread order).
    List<Memory> findByParentMemoryIdAndDeletedAtIsNullOrderByCreatedAtAsc(UUID parentMemoryId);

    long countByParentMemoryIdAndDeletedAtIsNull(UUID parentMemoryId);

    /**
     * Batched reply counts for many parents at once — avoids the per-memory count N+1 when
     * building a list of memory responses. Returns rows of [parentMemoryId, count].
     */
    @Query("""
        SELECT m.parentMemoryId, COUNT(m)
        FROM Memory m
        WHERE m.parentMemoryId IN :ids AND m.deletedAt IS NULL
        GROUP BY m.parentMemoryId
        """)
    List<Object[]> countRepliesByParentIds(@Param("ids") Collection<UUID> ids);

    @Query(value = """
        SELECT m.id
        FROM memories m
        WHERE (m.expires_at IS NULL OR m.expires_at > NOW())
          -- Replies (parent_memory_id set) are nested in the card, not standalone map pins.
          AND m.parent_memory_id IS NULL
          AND m.latitude BETWEEN :south AND :north
          AND ((:west <= :east AND m.longitude BETWEEN :west AND :east)
               OR (:west > :east AND (m.longitude >= :west OR m.longitude <= :east)))
          AND (
            (m.deleted_at IS NULL AND (
                m.creator_id = :viewerId
                OR (m.visibility = 'FOLLOWERS_PUBLIC'
                    AND EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = :viewerId AND f.following_id = m.creator_id)
                    AND NOT EXISTS (SELECT 1 FROM memory_creator_visibility_preferences p
                                    WHERE p.viewer_id = :viewerId AND p.creator_id = m.creator_id AND p.hide_public_memories = TRUE))
            ))
            OR EXISTS (
                SELECT 1 FROM memory_grants g
                WHERE g.memory_id = m.id
                  AND g.beneficiary_user_id = :viewerId
                  AND g.removed_at IS NULL
            )
          )
        ORDER BY m.created_at DESC
        LIMIT 250
        """, nativeQuery = true)
    List<UUID> findVisibleMapMemoryIds(
            @Param("viewerId") UUID viewerId,
            @Param("north") double north,
            @Param("south") double south,
            @Param("east") double east,
            @Param("west") double west);

    @Query("""
        SELECT DISTINCT m
        FROM Memory m
        LEFT JOIN FETCH m.media
        WHERE m.id IN :ids
        """)
    List<Memory> findAllWithMediaByIdIn(@Param("ids") Collection<UUID> ids);

    long countByCreatorIdAndDeletedAtIsNullAndCreatedAtAfter(UUID creatorId, java.time.Instant createdAt);

    /** Memories I created (excludes soft-deleted). Newest first. */
    @Query("""
        SELECT m FROM Memory m
        WHERE m.creatorId = :creatorId
          AND m.deletedAt IS NULL
          AND m.parentMemoryId IS NULL
        ORDER BY m.createdAt DESC
        """)
    List<Memory> findMyCreatedMemories(@Param("creatorId") UUID creatorId);

    /** Memories shared with me via either link-redemption or direct share. */
    @Query("""
        SELECT m FROM Memory m
        WHERE m.deletedAt IS NULL
          AND EXISTS (
              SELECT 1 FROM MemoryGrant g
              WHERE g.memoryId = m.id
                AND g.beneficiaryUserId = :viewerId
                AND g.removedAt IS NULL
          )
        ORDER BY m.createdAt DESC
        """)
    List<Memory> findMemoriesSharedWithMe(@Param("viewerId") UUID viewerId);
}
