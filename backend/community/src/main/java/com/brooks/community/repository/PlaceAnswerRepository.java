package com.brooks.community.repository;

import com.brooks.community.domain.PlaceAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface PlaceAnswerRepository extends JpaRepository<PlaceAnswer, UUID> {

    /** Live answers to a question (not expired/hidden/deleted). k-gate + block-filter in service. */
    List<PlaceAnswer> findByQuestionIdAndExpiresAtAfterAndHiddenAtIsNullAndDeletedAtIsNullOrderByCorroborationCountDescCreatedAtDesc(
            UUID questionId, Instant now);

    /** k-anonymity input: distinct responders with a live answer to this question. */
    @Query("""
        SELECT COUNT(DISTINCT a.responderId) FROM PlaceAnswer a
        WHERE a.questionId = :questionId
          AND a.expiresAt > :now
          AND a.hiddenAt IS NULL
          AND a.deletedAt IS NULL
        """)
    long countDistinctLiveResponders(@Param("questionId") UUID questionId, @Param("now") Instant now);

    /** Rate-limit input: how many answers this responder filed recently. */
    long countByResponderIdAndCreatedAtAfter(UUID responderId, Instant since);
}
