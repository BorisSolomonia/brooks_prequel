package com.brooks.community.repository;

import com.brooks.community.domain.CommunityModerationAction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface CommunityModerationActionRepository
        extends JpaRepository<CommunityModerationAction, UUID> {
}
