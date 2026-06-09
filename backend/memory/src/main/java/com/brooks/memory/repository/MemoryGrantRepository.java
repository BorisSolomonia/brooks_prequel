package com.brooks.memory.repository;

import com.brooks.memory.domain.MemoryGrant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MemoryGrantRepository extends JpaRepository<MemoryGrant, UUID> {

    Optional<MemoryGrant> findByMemoryIdAndBeneficiaryUserId(UUID memoryId, UUID beneficiaryUserId);

    /** Active (non-removed) grants for any of the given memories — used to list a memory's recipients. */
    List<MemoryGrant> findByMemoryIdInAndRemovedAtIsNull(Collection<UUID> memoryIds);

    @Query(value = """
        SELECT g.memory_id
        FROM memory_grants g
        WHERE g.beneficiary_user_id = :viewerId
          AND g.removed_at IS NULL
          AND g.memory_id IN :memoryIds
        """, nativeQuery = true)
    List<UUID> findActiveGrantedMemoryIdsForBeneficiary(
            @Param("viewerId") UUID viewerId,
            @Param("memoryIds") Collection<UUID> memoryIds);

    /**
     * Of the given memories, which ones this viewer has an active grant for that
     * is ALSO revealed (unlocked by reaching the location). Used to decide which
     * shared memories may expose their contents vs. stay a locked teaser.
     */
    @Query(value = """
        SELECT g.memory_id
        FROM memory_grants g
        WHERE g.beneficiary_user_id = :viewerId
          AND g.removed_at IS NULL
          AND g.revealed_at IS NOT NULL
          AND g.memory_id IN :memoryIds
        """, nativeQuery = true)
    List<UUID> findRevealedGrantedMemoryIdsForBeneficiary(
            @Param("viewerId") UUID viewerId,
            @Param("memoryIds") Collection<UUID> memoryIds);
}
