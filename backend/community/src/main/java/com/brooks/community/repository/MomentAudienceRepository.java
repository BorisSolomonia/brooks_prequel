package com.brooks.community.repository;

import com.brooks.community.domain.MomentAudience;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface MomentAudienceRepository extends JpaRepository<MomentAudience, UUID> {

    boolean existsByMomentIdAndAllowedUserId(UUID momentId, UUID allowedUserId);
}
