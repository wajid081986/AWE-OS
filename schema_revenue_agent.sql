-- ============================================================
-- AWE-OS v2 — Revenue Agent Schema
-- Run in: Supabase SQL Editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── revenue_snapshots ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS revenue_snapshots (
id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

snapshot_date       DATE NOT NULL,

daily_revenue       DECIMAL(12,2) DEFAULT 0.00,
weekly_revenue      DECIMAL(12,2) DEFAULT 0.00,
monthly_revenue     DECIMAL(12,2) DEFAULT 0.00,
total_revenue       DECIMAL(12,2) DEFAULT 0.00,

total_transactions  INTEGER DEFAULT 0,
successful_txns     INTEGER DEFAULT 0,
failed_txns         INTEGER DEFAULT 0,
avg_order_value     DECIMAL(10,2) DEFAULT 0.00,

active_subscribers  INTEGER DEFAULT 0,
new_subscribers     INTEGER DEFAULT 0,
churned_users       INTEGER DEFAULT 0,
churn_rate          DECIMAL(5,2) DEFAULT 0.00,

mrr                 DECIMAL(12,2) DEFAULT 0.00,
arr                 DECIMAL(12,2) DEFAULT 0.00,
ltv                 DECIMAL(12,2) DEFAULT 0.00,

revenue_by_tool     JSONB DEFAULT '[]',
ai_insights         JSONB DEFAULT '{}',

created_at          TIMESTAMP DEFAULT NOW(),

UNIQUE(snapshot_date)
);

-- ── failed_payments ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS failed_payments (
id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

user_id             UUID,
user_email          TEXT,
tool_id             UUID REFERENCES tools(id) ON DELETE SET NULL,
tool_name           TEXT,

amount              DECIMAL(10,2) NOT NULL,
currency            TEXT DEFAULT 'INR',

razorpay_order_id   TEXT,
failure_reason      TEXT,

retry_count         INTEGER DEFAULT 0,
last_retry_at       TIMESTAMP,
next_retry_at       TIMESTAMP,
resolved            BOOLEAN DEFAULT false,
resolved_at         TIMESTAMP,

created_at          TIMESTAMP DEFAULT NOW()
);

-- ── upsell_opportunities ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS upsell_opportunities (
id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

user_id             UUID,
user_email          TEXT,
tool_id             UUID REFERENCES tools(id) ON DELETE SET NULL,
tool_name           TEXT,

opportunity_type    TEXT CHECK (opportunity_type IN (
                      'free_to_paid', 'upgrade_plan',
                      'cross_sell', 'annual_plan', 're_engage'
                    )) NOT NULL,

current_plan        TEXT DEFAULT 'free',
suggested_plan      TEXT,
suggested_price     DECIMAL(10,2),

reason              TEXT,
score               INTEGER CHECK (score BETWEEN 0 AND 100),
ai_message          TEXT,

status              TEXT CHECK (status IN (
                      'identified', 'contacted', 'converted', 'dismissed'
                    )) DEFAULT 'identified',

identified_at       TIMESTAMP DEFAULT NOW(),
actioned_at         TIMESTAMP
);

-- ── revenue_alerts ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS revenue_alerts (
id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

alert_type          TEXT CHECK (alert_type IN (
                      'revenue_drop', 'churn_spike',
                      'payment_failure_surge', 'milestone_reached',
                      'upsell_opportunity', 'mrr_growth'
                    )) NOT NULL,

severity            TEXT CHECK (severity IN ('info', 'warning', 'critical')) DEFAULT 'info',

title               TEXT NOT NULL,
message             TEXT NOT NULL,
data                JSONB DEFAULT '{}',

action_required     BOOLEAN DEFAULT false,
suggested_action    TEXT,

acknowledged        BOOLEAN DEFAULT false,
acknowledged_at     TIMESTAMP,

created_at          TIMESTAMP DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rev_snapshots_date    ON revenue_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_failed_payments_res   ON failed_payments(resolved, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_upsell_status         ON upsell_opportunities(status, score DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_alerts_ack    ON revenue_alerts(acknowledged, created_at DESC);
