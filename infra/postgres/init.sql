-- Brooks database initialization
-- Tables are managed by Flyway migrations in the backend.
-- This file handles database-level setup only.

-- Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable trigram extension for future full-text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
