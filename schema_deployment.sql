-- ============================================================
-- AWE-OS v2 — Deployment Agent Schema
-- Run in: Supabase SQL Editor
-- ============================================================

-- Enable uuid extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── deployment_logs ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deployment_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  deploy_type     TEXT CHECK (deploy_type IN (
                    'backend', 'frontend', 'database', 'hotfix', 'rollback'
                  )) NOT NULL,

  version         TEXT,
  git_commit      TEXT,
  git_message     TEXT,

  status          TEXT CHECK (status IN (
                    'pending', 'validating', 'deploying',
                    'verifying', 'success', 'failed', 'rolled_back'
                  )) DEFAULT 'pending',

  pre_checks      JSONB DEFAULT '{}',
  post_checks     JSONB DEFAULT '{}',
  issues          JSONB DEFAULT '[]',

  started_at      TIMESTAMP DEFAULT NOW(),
  completed_at    TIMESTAMP,
  duration_ms     INTEGER,

  deployed_by     TEXT DEFAULT 'admin',
  notes           TEXT,

  created_at      TIMESTAMP DEFAULT NOW()
);

-- ── health_snapshots ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS health_snapshots (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  backend_status    TEXT CHECK (backend_status IN ('healthy', 'degraded', 'down')) DEFAULT 'healthy',
  frontend_status   TEXT CHECK (frontend_status IN ('healthy', 'degraded', 'down')) DEFAULT 'healthy',
  database_status   TEXT CHECK (database_status IN ('healthy', 'degraded', 'down')) DEFAULT 'healthy',

  backend_latency   INTEGER,
  frontend_latency  INTEGER,
  database_latency  INTEGER,

  checks            JSONB DEFAULT '{}',

  issues_count      INTEGER DEFAULT 0,
  issues            JSONB DEFAULT '[]',

  checked_at        TIMESTAMP DEFAULT NOW()
);

-- ── deployment_checklist ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS deployment_checklist (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deploy_id       UUID REFERENCES deployment_logs(id) ON DELETE CASCADE,

  check_name      TEXT NOT NULL,
  check_type      TEXT CHECK (check_type IN ('pre_deploy', 'post_deploy')) NOT NULL,

  status          TEXT CHECK (status IN ('pass', 'fail', 'warning', 'skip')) DEFAULT 'skip',

  message         TEXT,
  fix_suggestion  TEXT,
  checked_at      TIMESTAMP DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_deploy_logs_status  ON deployment_logs(status);
CREATE INDEX IF NOT EXISTS idx_deploy_logs_created ON deployment_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_checked      ON health_snapshots(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_checklist_deploy_id ON deployment_checklist(deploy_id);
