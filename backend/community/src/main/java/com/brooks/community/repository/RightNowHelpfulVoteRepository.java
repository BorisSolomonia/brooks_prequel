package com.brooks.community.repository;

import com.brooks.community.domain.RightNowHelpfulVote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.UUID;

@Repository
public interface RightNowHelpfulVoteRepository extends JpaRepository<RightNowHelpfulVote, UUID> {

    boolean existsByReportIdAndVoterId(UUID reportId, UUID voterId);

    long countByReportId(UUID reportId);

    /** Rate-limit input: votes cast by this user recently. */
    long countByVoterIdAndCreatedAtAfter(UUID voterId, Instant since);
}
