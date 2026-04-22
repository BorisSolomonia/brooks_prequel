package com.brooks.guide.repository;

import com.brooks.guide.domain.GuideBlock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GuideBlockRepository extends JpaRepository<GuideBlock, UUID> {

    List<GuideBlock> findByDayIdOrderByPositionAsc(UUID dayId);

    int countByDayId(UUID dayId);

    Optional<GuideBlock> findByIdAndDayGuideId(UUID id, UUID guideId);

    Optional<GuideBlock> findByIdAndDayId(UUID id, UUID dayId);
}
