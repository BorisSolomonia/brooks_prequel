package com.brooks.community.repository;

import com.brooks.community.domain.CommunityBlock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CommunityBlockRepository extends JpaRepository<CommunityBlock, UUID> {

    boolean existsByBlockerIdAndBlockedId(UUID blockerId, UUID blockedId);

    void deleteByBlockerIdAndBlockedId(UUID blockerId, UUID blockedId);

    /** Ids this viewer has blocked — their content is filtered from the viewer's reads. */
    @Query("SELECT b.blockedId FROM CommunityBlock b WHERE b.blockerId = :blockerId")
    List<UUID> findBlockedIdsByBlocker(@Param("blockerId") UUID blockerId);
}
