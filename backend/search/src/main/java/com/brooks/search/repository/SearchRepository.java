package com.brooks.search.repository;

import com.brooks.search.dto.CreatorSearchResult;
import com.brooks.search.dto.GuideSearchResult;
import com.brooks.search.dto.PlaceSearchResult;
import com.brooks.search.dto.RankedCreator;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class SearchRepository {

    private final JdbcTemplate jdbcTemplate;

    // ── Creator search ──────────────────────────────────────────

    public List<CreatorSearchResult> searchCreators(String tsQuery, int limit, int offset) {
        return jdbcTemplate.query("""
            SELECT u.id, u.username, p.display_name, p.avatar_url, p.region,
                   p.follower_count, p.guide_count, p.is_verified
            FROM user_profiles p
            JOIN users u ON u.id = p.user_id
            WHERE p.search_vector @@ plainto_tsquery('english', ?)
              AND u.status = 'ACTIVE'
            ORDER BY ts_rank(p.search_vector, plainto_tsquery('english', ?)) DESC,
                     p.follower_count DESC
            LIMIT ? OFFSET ?
            """,
            (rs, rowNum) -> CreatorSearchResult.builder()
                .userId(UUID.fromString(rs.getString("id")))
                .username(rs.getString("username"))
                .displayName(rs.getString("display_name"))
                .avatarUrl(rs.getString("avatar_url"))
                .region(rs.getString("region"))
                .followerCount(rs.getInt("follower_count"))
                .guideCount(rs.getInt("guide_count"))
                .verified(rs.getBoolean("is_verified"))
                .build(),
            tsQuery, tsQuery, limit, offset
        );
    }

    public long countCreators(String tsQuery) {
        Long count = jdbcTemplate.queryForObject("""
            SELECT COUNT(*)
            FROM user_profiles p
            JOIN users u ON u.id = p.user_id
            WHERE p.search_vector @@ plainto_tsquery('english', ?)
              AND u.status = 'ACTIVE'
            """, Long.class, tsQuery);
        return count != null ? count : 0;
    }

    // ── Guide search ────────────────────────────────────────────

    public List<GuideSearchResult> searchGuides(String tsQuery, int limit, int offset) {
        return searchGuides(tsQuery, limit, offset, null, List.of());
    }

    public List<GuideSearchResult> searchGuides(String tsQuery, int limit, int offset, String stage, List<String> personas) {
        StringBuilder sql = new StringBuilder("""
            SELECT g.id, g.title, g.cover_image_url, g.region, g.primary_city,
                   g.day_count, g.place_count, g.price_cents, g.currency,
                   u.username AS creator_username,
                   p.display_name AS creator_display_name
            FROM guides g
            JOIN users u ON u.id = g.creator_id
            LEFT JOIN user_profiles p ON p.user_id = g.creator_id
            WHERE g.search_vector @@ plainto_tsquery('english', ?)
              AND g.status = 'PUBLISHED'
            """);
        List<Object> params = new ArrayList<>();
        params.add(tsQuery);
        if (stage != null && !stage.isBlank()) {
            sql.append(" AND g.traveler_stage = ?");
            params.add(stage);
        }
        if (personas != null && !personas.isEmpty()) {
            sql.append(" AND EXISTS (SELECT 1 FROM guide_personas gp WHERE gp.guide_id = g.id AND gp.persona IN (");
            for (int i = 0; i < personas.size(); i++) {
                sql.append(i == 0 ? "?" : ",?");
                params.add(personas.get(i));
            }
            sql.append("))");
        }
        sql.append(" ORDER BY ts_rank(g.search_vector, plainto_tsquery('english', ?)) DESC, g.created_at DESC LIMIT ? OFFSET ?");
        params.add(tsQuery);
        params.add(limit);
        params.add(offset);
        return jdbcTemplate.query(sql.toString(),
            (rs, rowNum) -> GuideSearchResult.builder()
                .id(UUID.fromString(rs.getString("id")))
                .title(rs.getString("title"))
                .coverImageUrl(rs.getString("cover_image_url"))
                .region(rs.getString("region"))
                .primaryCity(rs.getString("primary_city"))
                .dayCount(rs.getInt("day_count"))
                .placeCount(rs.getInt("place_count"))
                .priceCents(rs.getInt("price_cents"))
                .currency(rs.getString("currency"))
                .creatorUsername(rs.getString("creator_username"))
                .creatorDisplayName(rs.getString("creator_display_name"))
                .build(),
            params.toArray()
        );
    }

    public long countGuides(String tsQuery) {
        return countGuides(tsQuery, null, List.of());
    }

    public long countGuides(String tsQuery, String stage, List<String> personas) {
        StringBuilder sql = new StringBuilder("""
            SELECT COUNT(*)
            FROM guides g
            WHERE g.search_vector @@ plainto_tsquery('english', ?)
              AND g.status = 'PUBLISHED'
            """);
        List<Object> params = new ArrayList<>();
        params.add(tsQuery);
        if (stage != null && !stage.isBlank()) {
            sql.append(" AND g.traveler_stage = ?");
            params.add(stage);
        }
        if (personas != null && !personas.isEmpty()) {
            sql.append(" AND EXISTS (SELECT 1 FROM guide_personas gp WHERE gp.guide_id = g.id AND gp.persona IN (");
            for (int i = 0; i < personas.size(); i++) {
                sql.append(i == 0 ? "?" : ",?");
                params.add(personas.get(i));
            }
            sql.append("))");
        }
        Long count = jdbcTemplate.queryForObject(sql.toString(), Long.class, params.toArray());
        return count != null ? count : 0;
    }

    // ── Place search ────────────────────────────────────────────

    public List<PlaceSearchResult> searchPlaces(String tsQuery, int limit, int offset) {
        return jdbcTemplate.query("""
            SELECT gp.id, gp.name, gp.category, gp.address, gp.latitude, gp.longitude,
                   g.id AS guide_id, g.title AS guide_title, g.region AS guide_region
            FROM guide_places gp
            JOIN guide_blocks gb ON gb.id = gp.block_id
            JOIN guide_days gd ON gd.id = gb.day_id
            JOIN guides g ON g.id = gd.guide_id
            WHERE gp.search_vector @@ plainto_tsquery('english', ?)
              AND g.status = 'PUBLISHED'
            ORDER BY ts_rank(gp.search_vector, plainto_tsquery('english', ?)) DESC
            LIMIT ? OFFSET ?
            """,
            (rs, rowNum) -> PlaceSearchResult.builder()
                .id(UUID.fromString(rs.getString("id")))
                .name(rs.getString("name"))
                .category(rs.getString("category"))
                .address(rs.getString("address"))
                .latitude(rs.getObject("latitude") != null ? rs.getDouble("latitude") : null)
                .longitude(rs.getObject("longitude") != null ? rs.getDouble("longitude") : null)
                .guideId(UUID.fromString(rs.getString("guide_id")))
                .guideTitle(rs.getString("guide_title"))
                .guideRegion(rs.getString("guide_region"))
                .build(),
            tsQuery, tsQuery, limit, offset
        );
    }

    public long countPlaces(String tsQuery) {
        Long count = jdbcTemplate.queryForObject("""
            SELECT COUNT(*)
            FROM guide_places gp
            JOIN guide_blocks gb ON gb.id = gp.block_id
            JOIN guide_days gd ON gd.id = gb.day_id
            JOIN guides g ON g.id = gd.guide_id
            WHERE gp.search_vector @@ plainto_tsquery('english', ?)
              AND g.status = 'PUBLISHED'
            """, Long.class, tsQuery);
        return count != null ? count : 0;
    }

    // ── Regional rankings ───────────────────────────────────────

    public List<RankedCreator> getRegionalRanking(String region, int limit, int offset) {
        return jdbcTemplate.query("""
            SELECT u.id, u.username, p.display_name, p.avatar_url, p.region,
                   p.follower_count, p.guide_count, p.is_verified,
                   (p.follower_count + (p.purchase_count * 2)) AS score
            FROM user_profiles p
            JOIN users u ON u.id = p.user_id
            WHERE p.region = ?
              AND u.status = 'ACTIVE'
            ORDER BY score DESC, p.follower_count DESC
            LIMIT ? OFFSET ?
            """,
            (rs, rowNum) -> RankedCreator.builder()
                .rank(offset + rowNum + 1)
                .userId(UUID.fromString(rs.getString("id")))
                .username(rs.getString("username"))
                .displayName(rs.getString("display_name"))
                .avatarUrl(rs.getString("avatar_url"))
                .region(rs.getString("region"))
                .followerCount(rs.getInt("follower_count"))
                .guideCount(rs.getInt("guide_count"))
                .verified(rs.getBoolean("is_verified"))
                .score(rs.getInt("score"))
                .build(),
            region, limit, offset
        );
    }

    public long countRegionalCreators(String region) {
        Long count = jdbcTemplate.queryForObject("""
            SELECT COUNT(*)
            FROM user_profiles p
            JOIN users u ON u.id = p.user_id
            WHERE p.region = ?
              AND u.status = 'ACTIVE'
            """, Long.class, region);
        return count != null ? count : 0;
    }
}
