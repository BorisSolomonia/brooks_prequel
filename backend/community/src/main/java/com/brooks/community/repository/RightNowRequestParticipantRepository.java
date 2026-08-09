package com.brooks.community.repository;

import com.brooks.community.domain.RightNowRequestParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface RightNowRequestParticipantRepository
        extends JpaRepository<RightNowRequestParticipant, UUID> {

    boolean existsByRequestIdAndAskerId(UUID requestId, UUID askerId);

    /** Distinct-asker count (the row set is already unique per (request, asker)). */
    long countByRequestId(UUID requestId);
}
