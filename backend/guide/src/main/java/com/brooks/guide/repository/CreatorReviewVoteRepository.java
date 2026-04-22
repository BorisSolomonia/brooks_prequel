package com.brooks.guide.repository;

import com.brooks.guide.domain.CreatorReviewVote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CreatorReviewVoteRepository extends JpaRepository<CreatorReviewVote, UUID> {

    Optional<CreatorReviewVote> findByCreatorReviewIdAndVoterId(UUID creatorReviewId, UUID voterId);

    List<CreatorReviewVote> findByCreatorReviewIdIn(List<UUID> creatorReviewIds);

    void deleteByCreatorReviewId(UUID creatorReviewId);
}
