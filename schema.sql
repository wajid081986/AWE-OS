-- ============================================================
-- AWE-OS v2 — Event Tracking Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Safe to re-run: all statements use IF NOT EXISTS / OR REPLACE
-- ============================================================

-- ── TABLE: tools ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tools (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  description     TEXT,
  status          TEXT CHECK (status IN ('idea','building','live','scaling','killed')) DEFAULT 'idea',
  usage_count     INTEGER DEFAULT 0,
  revenue         DECIMAL(10,2) DEFAULT 0.00,
  conversion_rate DECIMAL(5,2) DEFAULT 0.00,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- ── TABLE: tool_events ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS tool_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id     UUID REFERENCES tools(id) ON DELETE CASCADE,
  user_id     UUID,
  event_type  TEXT CHECK (event_type IN (
                'tool_viewed',
                'tool_used',
                'resume_generated',
                'payment_success',
                'user_signup',
                'tool_shared',
                'feature_clicked'
              )),
  metadata    JSONB DEFAULT '{}',
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ── TABLE: revenue_logs ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS revenue_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id    UUID REFERENCES tools(id),
  user_id    UUID,
  amount     DECIMAL(10,2) NOT NULL,
  currency   TEXT DEFAULT 'INR',
  source     TEXT DEFAULT 'razorpay',
  order_id   TEXT,
  status     TEXT CHECK (status IN ('pending','success','failed')),
  metadata   JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ── TABLE: experiments ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS experiments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id         UUID REFERENCES tools(id),
  name            TEXT NOT NULL,
  variant         TEXT CHECK (variant IN ('A','B')),
  visitors        INTEGER DEFAULT 0,
  conversions     INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0.00,
  status          TEXT CHECK (status IN ('running','completed','stopped')) DEFAULT 'running',
  created_at      TIMESTAMP DEFAULT NOW()
);

-- ── INDEXES ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tool_events_tool_id    ON tool_events(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_events_event_type ON tool_events(event_type);
CREATE INDEX IF NOT EXISTS idx_tool_events_created_at ON tool_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_logs_tool_id   ON revenue_logs(tool_id);
CREATE INDEX IF NOT EXISTS idx_revenue_logs_created_at ON revenue_logs(created_at DESC);

-- ── AUTO-UPDATE TRIGGER: tools.updated_at ────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tools_updated_at ON tools;
CREATE TRIGGER tools_updated_at
  BEFORE UPDATE ON tools
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ── RPC: atomic usage_count increment ────────────────────────
-- Using a function avoids read-then-write race conditions.
CREATE OR REPLACE FUNCTION increment_usage_count(p_tool_id UUID)
RETURNS VOID AS $$
  UPDATE tools SET usage_count = usage_count + 1 WHERE id = p_tool_id;
$$ LANGUAGE SQL SECURITY DEFINER;

-- ── RPC: atomic revenue increment ────────────────────────────
CREATE OR REPLACE FUNCTION increment_revenue(p_tool_id UUID, p_amount DECIMAL)
RETURNS VOID AS $$
  UPDATE tools SET revenue = revenue + p_amount WHERE id = p_tool_id;
$$ LANGUAGE SQL SECURITY DEFINER;

-- ── SEED: Resume Builder tool ─────────────────────────────────
-- Idempotent: only inserts if no tool named 'Resume Builder' exists.
INSERT INTO tools (name, description, status)
SELECT 'Resume Builder', 'AI-powered resume generator with premium templates', 'live'
WHERE NOT EXISTS (SELECT 1 FROM tools WHERE name = 'Resume Builder');
