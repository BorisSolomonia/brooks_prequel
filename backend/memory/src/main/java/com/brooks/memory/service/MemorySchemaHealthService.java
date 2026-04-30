package com.brooks.memory.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class MemorySchemaHealthService {

    private static final List<String> REQUIRED_TABLES = List.of(
            "memories",
            "memory_media",
            "memory_shares",
            "memory_reveals",
            "memory_creator_visibility_preferences",
            "product_events"
    );

    private static final Map<String, List<String>> REQUIRED_COLUMNS = Map.of(
            "memories", List.of("id", "creator_id", "text_content", "latitude", "longitude", "visibility", "created_at", "updated_at"),
            "memory_media", List.of("id", "memory_id", "media_type", "url", "position", "created_at", "updated_at"),
            "memory_shares", List.of("id", "memory_id", "token", "revoked_at", "created_at", "updated_at"),
            "memory_reveals", List.of("id", "memory_id", "share_id", "viewer_id", "succeeded", "distance_bucket", "created_at", "updated_at"),
            "memory_creator_visibility_preferences", List.of("id", "viewer_id", "creator_id", "hide_public_memories", "created_at", "updated_at"),
            "product_events", List.of("id", "event_name", "actor_id", "memory_id", "share_token", "source", "created_at", "updated_at")
    );

    private final JdbcTemplate jdbcTemplate;

    public MemorySchemaHealthService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public boolean isMemorySchemaReady() {
        try {
            for (String table : REQUIRED_TABLES) {
                Boolean exists = jdbcTemplate.queryForObject(
                        """
                        SELECT EXISTS (
                            SELECT 1
                            FROM information_schema.tables
                            WHERE table_schema = 'public'
                              AND table_name = ?
                        )
                        """,
                        Boolean.class,
                        table
                );
                if (!Boolean.TRUE.equals(exists)) {
                    log.error("Memory feature schema is not ready: missing table '{}'", table);
                    return false;
                }
                for (String column : REQUIRED_COLUMNS.getOrDefault(table, List.of())) {
                    Boolean columnExists = jdbcTemplate.queryForObject(
                            """
                            SELECT EXISTS (
                                SELECT 1
                                FROM information_schema.columns
                                WHERE table_schema = 'public'
                                  AND table_name = ?
                                  AND column_name = ?
                            )
                            """,
                            Boolean.class,
                            table,
                            column
                    );
                    if (!Boolean.TRUE.equals(columnExists)) {
                        log.error("Memory feature schema is not ready: missing column '{}.{}'", table, column);
                        return false;
                    }
                }
            }
            return true;
        } catch (RuntimeException ex) {
            log.error("Could not verify memory feature schema", ex);
            return false;
        }
    }
}
