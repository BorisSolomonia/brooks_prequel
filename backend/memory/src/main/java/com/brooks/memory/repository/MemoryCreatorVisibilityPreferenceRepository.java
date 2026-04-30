package com.brooks.memory.repository;

import com.brooks.memory.domain.MemoryCreatorVisibilityPreference;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface MemoryCreatorVisibilityPreferenceRepository extends JpaRepository<MemoryCreatorVisibilityPreference, UUID> {
    Optional<MemoryCreatorVisibilityPreference> findByViewerIdAndCreatorId(UUID viewerId, UUID creatorId);
}
