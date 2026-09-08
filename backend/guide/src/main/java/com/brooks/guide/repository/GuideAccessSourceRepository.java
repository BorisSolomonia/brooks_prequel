package com.brooks.guide.repository;

import com.brooks.guide.domain.GuideAccessSource;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface GuideAccessSourceRepository extends JpaRepository<GuideAccessSource, UUID> {
    boolean existsByGuidePurchaseIdAndRevokedAtIsNull(UUID guidePurchaseId);
}
