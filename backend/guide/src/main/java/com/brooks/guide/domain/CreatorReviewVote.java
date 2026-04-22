package com.brooks.guide.domain;

import com.brooks.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "creator_review_votes", uniqueConstraints = {
        @UniqueConstraint(name = "uq_creator_review_vote", columnNames = {"creator_review_id", "voter_id"})
})
@Getter
@Setter
@NoArgsConstructor
public class CreatorReviewVote extends BaseEntity {

    @Column(name = "creator_review_id", nullable = false)
    private UUID creatorReviewId;

    @Column(name = "voter_id", nullable = false)
    private UUID voterId;

    @Enumerated(EnumType.STRING)
    @Column(name = "vote_value", nullable = false, length = 20)
    private ReviewVoteValue voteValue;

    public CreatorReviewVote(UUID creatorReviewId, UUID voterId, ReviewVoteValue voteValue) {
        this.creatorReviewId = creatorReviewId;
        this.voterId = voterId;
        this.voteValue = voteValue;
    }
}
