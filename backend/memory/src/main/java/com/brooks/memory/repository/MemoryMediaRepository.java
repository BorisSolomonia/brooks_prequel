package com.brooks.memory.repository;

import com.brooks.memory.domain.MemoryMedia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface MemoryMediaRepository extends JpaRepository<MemoryMedia, UUID> {
    List<MemoryMedia> findByMemory_IdInOrderByPositionAsc(Collection<UUID> memoryIds);
}
