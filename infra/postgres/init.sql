-- Brooks database initialization
-- Tables are managed by Flyway migrations in the backend.
-- This file handles database-level setup only.

-- Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable trigram extension for future full-text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Per-query timing + plan stats. Re-enable AFTER:
--   1. infra/postgres/postgresql.conf is mounted again in docker-compose.yml
--      (postgres restart-loop bug got it disabled — see docs/INFRA.md).
--   2. shared_preload_libraries='pg_stat_statements' is confirmed loading cleanly.
-- Without (1) and (2), this CREATE EXTENSION fails on fresh-volume init.
-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
