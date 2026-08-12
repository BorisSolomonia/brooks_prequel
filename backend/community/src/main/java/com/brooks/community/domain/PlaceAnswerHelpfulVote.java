package com.brooks.community.domain;

import com.brooks.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/** Binary helpful vote on an answer. No self-vote (service-enforced); one per user per answer. */
@Entity
@Table(name = "place_answer_helpful_votes")
@Getter
@Setter
@NoArgsConstructor
public class PlaceAnswerHelpfulVote extends BaseEntity {

    @Column(name = "answer_id", nullable = false)
    private UUID answerId;

    @Column(name = "voter_id", nullable = false)
    private UUID voterId;

    public PlaceAnswerHelpfulVote(UUID answerId, UUID voterId) {
        this.answerId = answerId;
        this.voterId = voterId;
    }
}
