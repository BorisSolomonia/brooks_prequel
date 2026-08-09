package com.brooks.community.repository;

import com.brooks.community.domain.FlagCategory;
import com.brooks.community.domain.RightNowReportFlag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.UUID;

@Repository
public interface RightNowReportFlagRepository extends JpaRepository<RightNowReportFlag, UUID> {

    boolean existsByReportIdAndReporterId(UUID reportId, UUID reporterId);

    long countByReportId(UUID reportId);

    /** Distinct reporters flagging a report in non-critical categories (threshold auto-hide). */
    long countByReportIdAndCategoryIn(UUID reportId, Collection<FlagCategory> categories);
}
