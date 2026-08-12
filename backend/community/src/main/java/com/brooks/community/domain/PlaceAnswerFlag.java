package com.brooks.community.domain;

import com.brooks.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/** Report-an-answer. Critical categories auto-hide the answer pending review (service-enforced). */
@Entity
@Table(name = "place_answer_flags")
@Getter
@Setter
@NoArgsConstructor
public class PlaceAnswerFlag extends BaseEntity {

    @Column(name = "answer_id", nullable = false)
    private UUID answerId;

    @Column(name = "reporter_id", nullable = false)
    private UUID reporterId;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 20)
    private FlagCategory category;

    public PlaceAnswerFlag(UUID answerId, UUID reporterId, FlagCategory category) {
        this.answerId = answerId;
        this.reporterId = reporterId;
        this.category = category;
    }
}
