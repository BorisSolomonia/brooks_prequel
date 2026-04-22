package com.brooks.guide.repository;

import com.brooks.guide.domain.GuideCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface GuideCategoryRepository extends JpaRepository<GuideCategory, UUID> {

    Optional<GuideCategory> findByName(String name);
}
