-- Migration 032: strategy_decisions — content-strategy engine's decision diary
--
-- Phase 2 Step 3 (server/services/content-strategy.service.js) computes a
-- weekly content plan (data_driven or rotation_fallback) and calls
-- recordStrategyDecision() every time getWeeklyContentPlan() runs. This
-- table is that record — it lets us see after the fact which mode the
-- engine picked, why (rationale), and exactly what it planned, without
-- having to parse it back out of agent_logs metadata.

CREATE TABLE IF NOT EXISTS strategy_decisions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decided_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  mode         TEXT NOT NULL CHECK (mode IN ('data_driven', 'rotation_fallback')),
  rationale    TEXT NOT NULL,
  plan         JSONB NOT NULL DEFAULT '[]',
  cron_run_ref TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_strategy_decisions_decided_at ON strategy_decisions (decided_at DESC);
