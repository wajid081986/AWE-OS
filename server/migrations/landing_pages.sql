-- Landing Pages table for AI Landing Page Builder
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS landing_pages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID,
  title           TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,

  -- Input brief (what user provided)
  brief           JSONB NOT NULL DEFAULT '{}',
  -- brief shape: {
  --   productName, tagline, description, targetAudience,
  --   painPoints[], features[], pricing[], brandColors{primary,secondary},
  --   stylePreset, cta, competitors[], testimonials[], industry
  -- }

  -- Generated output
  html_content    TEXT,           -- complete single-file HTML
  preview_url     TEXT,           -- /p/[slug] public URL

  -- A/B variants
  variants        JSONB DEFAULT '[]',
  -- variants shape: [{ id, name, html_content, conversions, views }]

  -- Analytics
  views           INTEGER DEFAULT 0,
  conversions     INTEGER DEFAULT 0,

  -- Meta
  status          TEXT DEFAULT 'draft',       -- draft | generating | ready | published | failed
  style_preset    TEXT DEFAULT 'modern-saas',
  generation_score JSONB DEFAULT '{}',
  -- score shape: { copy: 0-100, design: 0-100, seo: 0-100, conversion: 0-100, overall: 0-100, tips: [] }

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  published_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_landing_pages_slug   ON landing_pages(slug);
CREATE INDEX IF NOT EXISTS idx_landing_pages_user   ON landing_pages(user_id);
CREATE INDEX IF NOT EXISTS idx_landing_pages_status ON landing_pages(status);
