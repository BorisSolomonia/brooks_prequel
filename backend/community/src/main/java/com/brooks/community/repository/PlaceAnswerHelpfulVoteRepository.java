package com.brooks.community.repository;

import com.brooks.community.domain.PlaceAnswerHelpfulVote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.UUID;

@Repository
public interface PlaceAnswerHelpfulVoteRepository extends JpaRepository<PlaceAnswerHelpfulVote, UUID> {

    boolean existsByAnswerIdAndVoterId(UUID answerId, UUID voterId);

    long countByVoterIdAndCreatedAtAfter(UUID voterId, Instant since);
}
