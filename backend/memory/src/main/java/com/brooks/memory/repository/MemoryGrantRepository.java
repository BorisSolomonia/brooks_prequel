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
}
