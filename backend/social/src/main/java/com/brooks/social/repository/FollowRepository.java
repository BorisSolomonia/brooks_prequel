package com.brooks.social.repository;

import com.brooks.social.domain.Follow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FollowRepository extends JpaRepository<Follow, UUID> {
    Optional<Follow> findByFollowerIdAndFollowingId(UUID followerId, UUID followingId);
    boolean existsByFollowerIdAndFollowingId(UUID followerId, UUID followingId);

    @Query("SELECT f.followingId FROM Follow f WHERE f.followerId = :followerId")
    List<UUID> findFollowingIdsByFollowerId(UUID followerId);

    @Query("SELECT f.followerId FROM Follow f WHERE f.followingId = :followingId")
    List<UUID> findFollowerIdsByFollowingId(UUID followingId);

    long countByFollowerId(UUID followerId);
    long countByFollowingId(UUID followingId);
}
