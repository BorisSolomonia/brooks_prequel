package com.brooks.guide.domain;

import com.brooks.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "guide_review_votes", uniqueConstraints = {
        @UniqueConstraint(name = "uq_guide_review_vote", columnNames = {"guide_review_id", "voter_id"})
})
@Getter
@Setter
@NoArgsConstructor
public class GuideReviewVote extends BaseEntity {

    @Column(name = "guide_review_id", nullable = false)
    private UUID guideReviewId;

    @Column(name = "voter_id", nullable = false)
    private UUID voterId;

    @Enumerated(EnumType.STRING)
    @Column(name = "vote_value", nullable = false, length = 20)
    private ReviewVoteValue voteValue;

    public GuideReviewVote(UUID guideReviewId, UUID voterId, ReviewVoteValue voteValue) {
        this.guideReviewId = guideReviewId;
        this.voterId = voterId;
        this.voteValue = voteValue;
    }
}
