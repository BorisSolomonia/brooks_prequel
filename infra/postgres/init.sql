-- Brooks database initialization
-- Tables are managed by Flyway migrations in the backend.
-- This file handles database-level setup only.

-- Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable trigram extension for future full-text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Per-query timing + plan stats. Read with:
--   SELECT query, mean_exec_time, calls
--   FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 20;
-- shared_preload_libraries='pg_stat_statements' must be set in postgresql.conf for this
-- extension to load — see infra/postgres/postgresql.conf.
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
