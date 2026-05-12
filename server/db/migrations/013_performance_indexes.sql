-- Phase 5F: Performance indexes for high-scale tool catalog
-- Run once against your Supabase / Postgres database.

-- Fast ILIKE / trigram search (required for GIN index below)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Composite partial index: published tools by category + creation date (most common query)
CREATE INDEX IF NOT EXISTS idx_saas_tools_pub_cat_created
  ON saas_tools (category, created_at DESC)
  WHERE is_published = true;

-- Partial index: quality-score sort
CREATE INDEX IF NOT EXISTS idx_saas_tools_pub_quality
  ON saas_tools (quality_score DESC)
  WHERE is_published = true;

-- Partial index: usage-count (popularity) sort
CREATE INDEX IF NOT EXISTS idx_saas_tools_pub_usage
  ON saas_tools (usage_count DESC)
  WHERE is_published = true;

-- Partial index: A-Z sort
CREATE INDEX IF NOT EXISTS idx_saas_tools_pub_name
  ON saas_tools (name ASC)
  WHERE is_published = true;

-- GIN trigram indexes for fast sub-string search on name and description
CREATE INDEX IF NOT EXISTS idx_saas_tools_name_trgm
  ON saas_tools USING gin (name gin_trgm_ops)
  WHERE is_published = true;

CREATE INDEX IF NOT EXISTS idx_saas_tools_desc_trgm
  ON saas_tools USING gin (description gin_trgm_ops)
  WHERE is_published = true;
