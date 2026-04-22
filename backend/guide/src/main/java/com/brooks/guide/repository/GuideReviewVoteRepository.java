package com.brooks.guide.repository;

import com.brooks.guide.domain.GuideReviewVote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GuideReviewVoteRepository extends JpaRepository<GuideReviewVote, UUID> {

    Optional<GuideReviewVote> findByGuideReviewIdAndVoterId(UUID guideReviewId, UUID voterId);

    List<GuideReviewVote> findByGuideReviewIdIn(List<UUID> guideReviewIds);

    void deleteByGuideReviewId(UUID guideReviewId);
}
