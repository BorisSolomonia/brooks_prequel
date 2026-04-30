package com.brooks.memory.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

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
            }
            return true;
        } catch (RuntimeException ex) {
            log.error("Could not verify memory feature schema", ex);
            return false;
        }
    }
}
