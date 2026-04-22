package com.brooks.guide.repository;

import com.brooks.guide.domain.GuideTag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface GuideTagRepository extends JpaRepository<GuideTag, UUID> {

    @Modifying
    @Query("DELETE FROM GuideTag t WHERE t.guide.id = :guideId")
    void deleteByGuideId(@Param("guideId") UUID guideId);
}
