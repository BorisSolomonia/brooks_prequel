package com.brooks.guide.repository;

import com.brooks.guide.domain.Guide;
import com.brooks.guide.domain.GuideStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface GuideRepository extends JpaRepository<Guide, UUID> {

    Optional<Guide> findFirstByCreatorIdOrderByCreatedAtAsc(UUID creatorId);

    Page<Guide> findByCreatorIdAndStatusNot(UUID creatorId, GuideStatus status, Pageable pageable);

    Page<Guide> findByCreatorIdAndStatus(UUID creatorId, GuideStatus status, Pageable pageable);

    Page<Guide> findByCreatorIdAndStatusOrderBySortOrderAscUpdatedAtDesc(UUID creatorId, GuideStatus status, Pageable pageable);
}
