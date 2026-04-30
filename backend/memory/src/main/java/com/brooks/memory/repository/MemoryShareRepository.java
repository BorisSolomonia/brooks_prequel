package com.brooks.memory.repository;

import com.brooks.memory.domain.MemoryShare;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MemoryShareRepository extends JpaRepository<MemoryShare, UUID> {
    Optional<MemoryShare> findFirstByMemory_IdAndRevokedAtIsNullOrderByCreatedAtDesc(UUID memoryId);
    List<MemoryShare> findByMemory_IdAndRevokedAtIsNull(UUID memoryId);
    Optional<MemoryShare> findByTokenAndRevokedAtIsNull(String token);
}
