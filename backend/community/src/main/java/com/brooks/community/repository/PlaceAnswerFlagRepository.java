package com.brooks.community.repository;

import com.brooks.community.domain.FlagCategory;
import com.brooks.community.domain.PlaceAnswerFlag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.UUID;

@Repository
public interface PlaceAnswerFlagRepository extends JpaRepository<PlaceAnswerFlag, UUID> {

    boolean existsByAnswerIdAndReporterId(UUID answerId, UUID reporterId);

    long countByAnswerIdAndCategoryIn(UUID answerId, Collection<FlagCategory> categories);
}
