package com.brooks.guide.repository;

import com.brooks.guide.domain.SavedGuide;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SavedGuideRepository extends JpaRepository<SavedGuide, UUID> {

    boolean existsByUserIdAndGuideId(UUID userId, UUID guideId);

    Optional<SavedGuide> findByUserIdAndGuideId(UUID userId, UUID guideId);

    List<SavedGuide> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
