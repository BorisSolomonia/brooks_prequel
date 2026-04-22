package com.brooks.guide.repository;

import com.brooks.guide.domain.GuideVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface GuideVersionRepository extends JpaRepository<GuideVersion, UUID> {

    Optional<GuideVersion> findByGuideIdAndVersionNumber(UUID guideId, int versionNumber);
}
