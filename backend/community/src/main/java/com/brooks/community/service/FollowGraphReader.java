package com.brooks.community.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Read-only view of the social module's follow graph (`follows` table), reached via JdbcTemplate
 * so the community module does NOT take a compile dependency on `social`. Moments are follower-
 * scoped (D-3), so every Moment read resolves the viewer's follow set here.
 */
@Component
@RequiredArgsConstructor
public class FollowGraphReader {

    private final JdbcTemplate jdbc;

    /** True if {@code followerId} follows {@code followingId}. */
    @Transactional(readOnly = true)
    public boolean isFollowing(UUID followerId, UUID followingId) {
        Boolean exists = jdbc.queryForObject(
                "SELECT EXISTS(SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?)",
                Boolean.class, followerId, followingId);
        return Boolean.TRUE.equals(exists);
    }

    /** The set of user ids {@code followerId} follows (the authors whose Moments they may see). */
    @Transactional(readOnly = true)
    public List<UUID> findFollowingIds(UUID followerId) {
        return jdbc.query(
                "SELECT following_id FROM follows WHERE follower_id = ?",
                (rs, i) -> rs.getObject("following_id", UUID.class),
                followerId);
    }
}
