package com.brooks.guide.repository;

import com.brooks.guide.domain.GuidePlace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GuidePlaceRepository extends JpaRepository<GuidePlace, UUID> {

    List<GuidePlace> findByBlockIdOrderByPositionAsc(UUID blockId);

    int countByBlockId(UUID blockId);

    Optional<GuidePlace> findByIdAndBlockDayGuideId(UUID id, UUID guideId);

    Optional<GuidePlace> findByIdAndBlockId(UUID id, UUID blockId);
}
