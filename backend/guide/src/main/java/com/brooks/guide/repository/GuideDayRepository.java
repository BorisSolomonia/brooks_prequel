package com.brooks.guide.repository;

import com.brooks.guide.domain.GuideDay;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GuideDayRepository extends JpaRepository<GuideDay, UUID> {

    List<GuideDay> findByGuideIdOrderByDayNumberAsc(UUID guideId);

    void deleteByGuideId(UUID guideId);

    int countByGuideId(UUID guideId);

    Optional<GuideDay> findByIdAndGuideId(UUID id, UUID guideId);
}
