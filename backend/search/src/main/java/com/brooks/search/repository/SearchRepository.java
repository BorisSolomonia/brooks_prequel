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

    // Trigram similarity threshold for fuzzy matches. Default pg_trgm
    // threshold is 0.3; 0.25 catches one more typo class (e.g. "Tbilsi"
    // → "Tbilisi" sits at ~0.66 anyway, but "ttbilisi" sits at ~0.31).
    // Tuned conservatively — too low and unrelated cities pollute results.
    private static final double FUZZY_THRESHOLD = 0.25;

    // ── Creator search ──────────────────────────────────────────

    public List<CreatorSearchResult> searchCreators(String tsQuery, int limit, int offset) {
        return searchCreators(tsQuery, limit, offset, null, null, null);
    }

    // LEFT JOIN user_profiles so users WITHOUT a profile row are still findable.
    // A blank tsQuery means "browse + filter all active creators" (no text match
    // clause). minRating/verified narrow; sort is an allowlisted enum.
    public List<CreatorSearchResult> searchCreators(String tsQuery, int limit, int offset,
                                                    Double minRating, Boolean verified, String sort) {
        boolean hasQuery = tsQuery != null && !tsQuery.isBlank();
        List<Object> params = new ArrayList<>();
        StringBuilder sql = new StringBuilder("""
            SELECT u.id, u.username,
                   COALESCE(p.display_name, u.username) AS display_name,
                   p.avatar_url, p.region,
                   COALESCE(p.follower_count, 0) AS follower_count,
                   COALESCE(p.guide_count, 0) AS guide_count,
                   COALESCE(p.is_verified, false) AS is_verified,
                   COALESCE(p.creator_rating_average, 0) AS creator_rating_average
            FROM users u
            LEFT JOIN user_profiles p ON p.user_id = u.id
            WHERE u.status = 'ACTIVE'
            """);
        if (hasQuery) {
            sql.append("""
                  AND (
                      (p.search_vector IS NOT NULL AND p.search_vector @@ plainto_tsquery('english', ?))
                      OR LOWER(u.username) LIKE LOWER('%' || ? || '%')
                      OR similarity(LOWER(COALESCE(p.region, '')), LOWER(?)) >= ?
                  )
                """);
            params.add(tsQuery); params.add(tsQuery); params.add(tsQuery); params.add(FUZZY_THRESHOLD);
        }
        if (minRating != null) {
            sql.append(" AND COALESCE(p.creator_rating_average, 0) >= ?");
            params.add(minRating);
        }
        if (Boolean.TRUE.equals(verified)) {
            sql.append(" AND COALESCE(p.is_verified, false) = true");
        }
        sql.append(" ORDER BY ").append(creatorOrderBy(sort, hasQuery, params, tsQuery));
        sql.append(" LIMIT ? OFFSET ?");
        params.add(limit); params.add(offset);
        return jdbcTemplate.query(sql.toString(),
            (rs, rowNum) -> CreatorSearchResult.builder()
                .userId(UUID.fromString(rs.getString("id")))
                .username(rs.getString("username"))
                .displayName(rs.getString("display_name"))
                .avatarUrl(rs.getString("avatar_url"))
                .region(rs.getString("region"))
                .followerCount(rs.getInt("follower_count"))
                .guideCount(rs.getInt("guide_count"))
                .verified(rs.getBoolean("is_verified"))
                .creatorRatingAverage(rs.getDouble("creator_rating_average"))
                .build(),
            params.toArray()
        );
    }

    // Allowlisted creator ORDER BY — the raw sort string is NEVER interpolated.
    private String creatorOrderBy(String sort, boolean hasQuery, List<Object> params, String tsQuery) {
        String s = sort == null ? "RELEVANCE" : sort.trim().toUpperCase();
        switch (s) {
            case "TOP_RATED":
                return "COALESCE(p.creator_rating_average, 0) DESC, COALESCE(p.follower_count, 0) DESC";
            case "MOST_FOLLOWERS":
                return "COALESCE(p.follower_count, 0) DESC";
            case "NEWEST":
                return "u.created_at DESC";
            case "RELEVANCE":
            default:
                if (hasQuery) {
                    params.add(tsQuery);
                    return "COALESCE(ts_rank(p.search_vector, plainto_tsquery('english', ?)), 0) DESC, "
                         + "COALESCE(p.follower_count, 0) DESC";
                }
                return "COALESCE(p.follower_count, 0) DESC";
        }
    }

    public long countCreators(String tsQuery) {
        return countCreators(tsQuery, null, null);
    }

    public long countCreators(String tsQuery, Double minRating, Boolean verified) {
        boolean hasQuery = tsQuery != null && !tsQuery.isBlank();
        List<Object> params = new ArrayList<>();
        StringBuilder sql = new StringBuilder("""
            SELECT COUNT(*)
            FROM users u
            LEFT JOIN user_profiles p ON p.user_id = u.id
            WHERE u.status = 'ACTIVE'
            """);
        if (hasQuery) {
            sql.append("""
                  AND (
                      (p.search_vector IS NOT NULL AND p.search_vector @@ plainto_tsquery('english', ?))
                      OR LOWER(u.username) LIKE LOWER('%' || ? || '%')
                      OR similarity(LOWER(COALESCE(p.region, '')), LOWER(?)) >= ?
                  )
                """);
            params.add(tsQuery); params.add(tsQuery); params.add(tsQuery); params.add(FUZZY_THRESHOLD);
        }
        if (minRating != null) { sql.append(" AND COALESCE(p.creator_rating_average, 0) >= ?"); params.add(minRating); }
        if (Boolean.TRUE.equals(verified)) { sql.append(" AND COALESCE(p.is_verified, false) = true"); }
        Long count = jdbcTemplate.queryForObject(sql.toString(), Long.class, params.toArray());
        return count != null ? count : 0;
    }

    // ── Guide search ────────────────────────────────────────────

    // Effective (sale-aware) price — reused in SELECT, the price-range filter, and ORDER BY.
    private static final String EFFECTIVE_PRICE =
            "(CASE WHEN g.sale_price_cents IS NOT NULL AND (g.sale_ends_at IS NULL OR g.sale_ends_at > NOW()) "
          + "THEN g.sale_price_cents ELSE g.price_cents END)";

    // Weekly traction = completed purchases (last 7d) x2 + saves (last 7d). Reused
    // in SELECT (as weekly_popularity_score) and in the no-query relevance ORDER BY,
    // so both stay in lock-step (same reason EFFECTIVE_PRICE is a shared constant).
    private static final String WEEKLY_POPULARITY =
            "(COUNT(DISTINCT gp.id) FILTER (WHERE gp.status = 'COMPLETED' AND gp.created_at >= NOW() - INTERVAL '7 days') * 2 "
          + " + COUNT(DISTINCT sg.id) FILTER (WHERE sg.created_at >= NOW() - INTERVAL '7 days'))";

    // Bayesian-average priors for the no-query relevance score. A guide's own rating
    // is shrunk toward the global mean until it has enough reviews to be trusted:
    //   bayesian = (C*m + sum_ratings) / (C + review_count)
    // C = "how many reviews of prior weight"; m = assumed global mean rating.
    private static final double BAYES_CONFIDENCE = 10.0;   // C
    private static final double GLOBAL_MEAN_RATING = 4.3;  // m

    public List<GuideSearchResult> searchGuides(String tsQuery, int limit, int offset) {
        return searchGuides(tsQuery, limit, offset, null, List.of());
    }

    public List<GuideSearchResult> searchGuides(String tsQuery, int limit, int offset, String stage, List<String> personas) {
        return searchGuides(tsQuery, limit, offset, stage, personas, null, null, null, null);
    }

    // Blank tsQuery = browse the whole published catalogue. minRating (HAVING on
    // AVG review rating), price range, stage and personas narrow the set; sort is
    // an allowlisted enum (see guideOrderBy) so no user text reaches ORDER BY.
    public List<GuideSearchResult> searchGuides(String tsQuery, int limit, int offset, String stage, List<String> personas,
                                                Double minRating, Integer minPriceCents, Integer maxPriceCents, String sort) {
        boolean hasQuery = tsQuery != null && !tsQuery.isBlank();
        List<Object> params = new ArrayList<>();
        StringBuilder sql = new StringBuilder(
            "SELECT g.id, g.title, g.cover_image_url, g.region, g.primary_city, "
          + "g.day_count, g.place_count, g.price_cents, g.sale_price_cents, "
          + EFFECTIVE_PRICE + " AS effective_price_cents, "
          + "g.currency, "
          + "COALESCE(NULLIF(g.primary_city, ''), NULLIF(g.region, ''), g.country) AS display_location, "
          + "COALESCE(AVG(gr.rating), 0) AS average_rating, "
          + "COUNT(DISTINCT gr.id) AS review_count, "
          + WEEKLY_POPULARITY + "::int AS weekly_popularity_score, "
          + "g.creator_id AS creator_id, "
          + "u.username AS creator_username, p.display_name AS creator_display_name, "
          + "p.avatar_url AS creator_avatar_url "
          + "FROM guides g "
          + "JOIN users u ON u.id = g.creator_id "
          + "LEFT JOIN user_profiles p ON p.user_id = g.creator_id "
          + "LEFT JOIN guide_reviews gr ON gr.guide_id = g.id "
          + "LEFT JOIN guide_purchases gp ON gp.guide_id = g.id "
          + "LEFT JOIN saved_guides sg ON sg.guide_id = g.id");
        appendGuideWhere(sql, params, tsQuery, hasQuery, stage, personas, minPriceCents, maxPriceCents);
        sql.append(" GROUP BY g.id, u.username, p.display_name, p.avatar_url");
        if (minRating != null) {
            sql.append(" HAVING COALESCE(AVG(gr.rating), 0) >= ?");
            params.add(minRating);
        }
        sql.append(" ORDER BY ").append(guideOrderBy(sort, hasQuery, params, tsQuery));
        sql.append(" LIMIT ? OFFSET ?");
        params.add(limit); params.add(offset);
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
                .salePriceCents(rs.getObject("sale_price_cents") != null ? rs.getInt("sale_price_cents") : null)
                .effectivePriceCents(rs.getInt("effective_price_cents"))
                .currency(rs.getString("currency"))
                .displayLocation(rs.getString("display_location"))
                .spotCount(rs.getInt("place_count"))
                .averageRating(rs.getDouble("average_rating"))
                .reviewCount(rs.getInt("review_count"))
                .weeklyPopularityScore(rs.getInt("weekly_popularity_score"))
                .popularThisWeek(rs.getInt("weekly_popularity_score") >= 5)
                .creatorId(UUID.fromString(rs.getString("creator_id")))
                .creatorUsername(rs.getString("creator_username"))
                .creatorDisplayName(rs.getString("creator_display_name"))
                .creatorAvatarUrl(rs.getString("creator_avatar_url"))
                .build(),
            params.toArray()
        );
    }

    // Shared WHERE builder for guide search + count (keeps the two in lock-step).
    private void appendGuideWhere(StringBuilder sql, List<Object> params, String tsQuery, boolean hasQuery,
                                  String stage, List<String> personas, Integer minPriceCents, Integer maxPriceCents) {
        sql.append(" WHERE g.status = 'PUBLISHED'");
        if (hasQuery) {
            // Fuzzy city/region/country match (V52 trigram indexes) alongside FTS,
            // so exact words still rank higher via ts_rank when sort = RELEVANCE.
            sql.append(" AND (g.search_vector @@ plainto_tsquery('english', ?)")
               .append(" OR similarity(LOWER(COALESCE(g.primary_city, '')), LOWER(?)) >= ?")
               .append(" OR similarity(LOWER(COALESCE(g.region, '')), LOWER(?)) >= ?")
               .append(" OR similarity(LOWER(COALESCE(g.country, '')), LOWER(?)) >= ?)");
            params.add(tsQuery);
            params.add(tsQuery); params.add(FUZZY_THRESHOLD);
            params.add(tsQuery); params.add(FUZZY_THRESHOLD);
            params.add(tsQuery); params.add(FUZZY_THRESHOLD);
        }
        if (stage != null && !stage.isBlank()) {
            sql.append(" AND g.traveler_stage = ?");
            params.add(stage);
        }
        if (personas != null && !personas.isEmpty()) {
            sql.append(" AND EXISTS (SELECT 1 FROM guide_personas gpe WHERE gpe.guide_id = g.id AND gpe.persona IN (");
            for (int i = 0; i < personas.size(); i++) {
                sql.append(i == 0 ? "?" : ",?");
                params.add(personas.get(i));
            }
            sql.append("))");
        }
        if (minPriceCents != null) { sql.append(" AND ").append(EFFECTIVE_PRICE).append(" >= ?"); params.add(minPriceCents); }
        if (maxPriceCents != null) { sql.append(" AND ").append(EFFECTIVE_PRICE).append(" <= ?"); params.add(maxPriceCents); }
    }

    // Allowlisted guide ORDER BY — the raw sort string is NEVER interpolated.
    private String guideOrderBy(String sort, boolean hasQuery, List<Object> params, String tsQuery) {
        String s = sort == null ? "RELEVANCE" : sort.trim().toUpperCase();
        switch (s) {
            case "NEWEST":     return "g.created_at DESC";
            case "OLDEST":     return "g.created_at ASC";
            case "TOP_RATED":  return "average_rating DESC, review_count DESC";
            case "PRICE_ASC":  return "effective_price_cents ASC";
            case "PRICE_DESC": return "effective_price_cents DESC";
            case "POPULAR":    return "weekly_popularity_score DESC, g.created_at DESC";
            case "RELEVANCE":
            default:
                if (hasQuery) {
                    params.add(tsQuery);
                    return "ts_rank(g.search_vector, plainto_tsquery('english', ?)) DESC, g.created_at DESC";
                }
                // No query → discovery ranking (the "golden path"): a 0..1 blend of
                //   0.55 * Bayesian quality  +  0.30 * capped 7-day traction  +  0.15 * freshness decay
                // tiebroken by recency. Aliases can't appear inside an ORDER BY
                // expression (PG reads them as input columns), so the raw aggregates
                // are repeated here. The two params are C*m then C for the Bayesian term.
                params.add(BAYES_CONFIDENCE * GLOBAL_MEAN_RATING); // C*m (numerator prior)
                params.add(BAYES_CONFIDENCE);                      // C   (denominator prior)
                return "0.55 * ((? + COALESCE(AVG(gr.rating), 0) * COUNT(DISTINCT gr.id)) "
                     + "/ (? + COUNT(DISTINCT gr.id)) / 5.0) "
                     + "+ 0.30 * LEAST(" + WEEKLY_POPULARITY + " / 20.0, 1.0) "
                     + "+ 0.15 * EXP(- EXTRACT(EPOCH FROM (NOW() - g.created_at)) / 2592000.0) "
                     + "DESC, g.created_at DESC";
        }
    }

    public long countGuides(String tsQuery) {
        return countGuides(tsQuery, null, List.of());
    }

    public long countGuides(String tsQuery, String stage, List<String> personas) {
        return countGuides(tsQuery, stage, personas, null, null, null);
    }

    public long countGuides(String tsQuery, String stage, List<String> personas,
                            Double minRating, Integer minPriceCents, Integer maxPriceCents) {
        boolean hasQuery = tsQuery != null && !tsQuery.isBlank();
        List<Object> params = new ArrayList<>();
        // Wrap in a subquery so minRating's GROUP BY + HAVING is counted correctly.
        StringBuilder inner = new StringBuilder("SELECT g.id FROM guides g");
        if (minRating != null) {
            inner.append(" LEFT JOIN guide_reviews gr ON gr.guide_id = g.id");
        }
        appendGuideWhere(inner, params, tsQuery, hasQuery, stage, personas, minPriceCents, maxPriceCents);
        if (minRating != null) {
            inner.append(" GROUP BY g.id HAVING COALESCE(AVG(gr.rating), 0) >= ?");
            params.add(minRating);
        }
        Long count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM (" + inner + ") sub", Long.class, params.toArray());
        return count != null ? count : 0;
    }

    // ── Place search ────────────────────────────────────────────

    public List<GuideSearchResult> listPublishedGuides(int limit, int offset) {
        return jdbcTemplate.query("""
            SELECT g.id, g.title, g.cover_image_url, g.region, g.primary_city,
                   g.day_count, g.place_count, g.price_cents, g.sale_price_cents,
                   CASE
                       WHEN g.sale_price_cents IS NOT NULL
                        AND (g.sale_ends_at IS NULL OR g.sale_ends_at > NOW())
                       THEN g.sale_price_cents
                       ELSE g.price_cents
                   END AS effective_price_cents,
                   g.currency,
                   COALESCE(NULLIF(g.primary_city, ''), NULLIF(g.region, ''), g.country) AS display_location,
                   COALESCE(AVG(gr.rating), 0) AS average_rating,
                   COUNT(DISTINCT gr.id) AS review_count,
                   (
                       COUNT(DISTINCT gp.id) FILTER (
                           WHERE gp.status = 'COMPLETED'
                             AND gp.created_at >= NOW() - INTERVAL '7 days'
                       ) * 2
                       + COUNT(DISTINCT sg.id) FILTER (
                           WHERE sg.created_at >= NOW() - INTERVAL '7 days'
                       )
                   )::int AS weekly_popularity_score,
                   g.creator_id AS creator_id,
                   u.username AS creator_username,
                   p.display_name AS creator_display_name,
                   p.avatar_url AS creator_avatar_url
            FROM guides g
            JOIN users u ON u.id = g.creator_id
            LEFT JOIN user_profiles p ON p.user_id = g.creator_id
            LEFT JOIN guide_reviews gr ON gr.guide_id = g.id
            LEFT JOIN guide_purchases gp ON gp.guide_id = g.id
            LEFT JOIN saved_guides sg ON sg.guide_id = g.id
            WHERE g.status = 'PUBLISHED'
            GROUP BY g.id, u.username, p.display_name, p.avatar_url
            ORDER BY g.created_at DESC
            LIMIT ? OFFSET ?
            """,
            (rs, rowNum) -> GuideSearchResult.builder()
                .id(UUID.fromString(rs.getString("id")))
                .title(rs.getString("title"))
                .coverImageUrl(rs.getString("cover_image_url"))
                .region(rs.getString("region"))
                .primaryCity(rs.getString("primary_city"))
                .dayCount(rs.getInt("day_count"))
                .placeCount(rs.getInt("place_count"))
                .priceCents(rs.getInt("price_cents"))
                .salePriceCents(rs.getObject("sale_price_cents") != null ? rs.getInt("sale_price_cents") : null)
                .effectivePriceCents(rs.getInt("effective_price_cents"))
                .currency(rs.getString("currency"))
                .displayLocation(rs.getString("display_location"))
                .spotCount(rs.getInt("place_count"))
                .averageRating(rs.getDouble("average_rating"))
                .reviewCount(rs.getInt("review_count"))
                .weeklyPopularityScore(rs.getInt("weekly_popularity_score"))
                .popularThisWeek(rs.getInt("weekly_popularity_score") >= 5)
                .creatorId(UUID.fromString(rs.getString("creator_id")))
                .creatorUsername(rs.getString("creator_username"))
                .creatorDisplayName(rs.getString("creator_display_name"))
                .creatorAvatarUrl(rs.getString("creator_avatar_url"))
                .build(),
            limit, offset
        );
    }

    public long countPublishedGuides() {
        Long count = jdbcTemplate.queryForObject("""
            SELECT COUNT(*)
            FROM guides g
            WHERE g.status = 'PUBLISHED'
            """, Long.class);
        return count != null ? count : 0;
    }

    public List<PlaceSearchResult> searchPlaces(String tsQuery, int limit, int offset) {
        return jdbcTemplate.query("""
            SELECT gp.id, gp.name, gp.category, gp.address, gp.latitude, gp.longitude,
                   g.id AS guide_id, g.title AS guide_title, g.region AS guide_region
            FROM guide_places gp
            JOIN guide_blocks gb ON gb.id = gp.block_id
            JOIN guide_days gd ON gd.id = gb.day_id
            JOIN guides g ON g.id = gd.guide_id
            WHERE (
                  gp.search_vector @@ plainto_tsquery('english', ?)
                  -- Fuzzy address + name match for typo tolerance
                  -- (V52 trigram indexes). Exact-word hits still
                  -- rank higher via ts_rank in the ORDER BY.
                  OR similarity(LOWER(COALESCE(gp.address, '')), LOWER(?)) >= ?
                  OR similarity(LOWER(COALESCE(gp.name, '')), LOWER(?)) >= ?
              )
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
            tsQuery, tsQuery, FUZZY_THRESHOLD, tsQuery, FUZZY_THRESHOLD, tsQuery, limit, offset
        );
    }

    public long countPlaces(String tsQuery) {
        Long count = jdbcTemplate.queryForObject("""
            SELECT COUNT(*)
            FROM guide_places gp
            JOIN guide_blocks gb ON gb.id = gp.block_id
            JOIN guide_days gd ON gd.id = gb.day_id
            JOIN guides g ON g.id = gd.guide_id
            WHERE (
                  gp.search_vector @@ plainto_tsquery('english', ?)
                  OR similarity(LOWER(COALESCE(gp.address, '')), LOWER(?)) >= ?
                  OR similarity(LOWER(COALESCE(gp.name, '')), LOWER(?)) >= ?
              )
              AND g.status = 'PUBLISHED'
            """, Long.class, tsQuery, tsQuery, FUZZY_THRESHOLD, tsQuery, FUZZY_THRESHOLD);
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
