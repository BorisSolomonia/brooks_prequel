package com.brooks.community.repository;

import com.brooks.community.domain.RightNowReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface RightNowReportRepository extends JpaRepository<RightNowReport, UUID> {

    /** Live reports for a place (not expired, not hidden, not deleted). Blocked authors + k-gate applied in service. */
    List<RightNowReport> findByPlaceIdAndExpiresAtAfterAndHiddenAtIsNullAndDeletedAtIsNullOrderByCorroborationCountDescCreatedAtDesc(
            UUID placeId, Instant now);

    /**
     * k-anonymity input: the number of DISTINCT authors with a live report at the place.
     * A report/presence signal is surfaced only when this reaches K_show.
     */
    @Query("""
        SELECT COUNT(DISTINCT r.authorId) FROM RightNowReport r
        WHERE r.placeId = :placeId
          AND r.expiresAt > :now
          AND r.hiddenAt IS NULL
          AND r.deletedAt IS NULL
        """)
    long countDistinctLiveAuthors(@Param("placeId") UUID placeId, @Param("now") Instant now);

    /** Corroboration input: distinct authors reporting the same status at the place, live. */
    @Query("""
        SELECT COUNT(DISTINCT r.authorId) FROM RightNowReport r
        WHERE r.placeId = :placeId
          AND r.status = :status
          AND r.expiresAt > :now
          AND r.hiddenAt IS NULL
          AND r.deletedAt IS NULL
        """)
    long countDistinctLiveAuthorsByStatus(@Param("placeId") UUID placeId,
                                          @Param("status") com.brooks.community.domain.RightNowStatus status,
                                          @Param("now") Instant now);

    /** Rate-limit input: how many reports this author filed at this place recently. */
    long countByAuthorIdAndPlaceIdAndCreatedAtAfter(UUID authorId, UUID placeId, Instant since);
}
