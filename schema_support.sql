-- ============================================================
-- AWE-OS v2 — Support Schema
-- schema_support.sql
-- ============================================================

-- 1. support_tickets
CREATE TABLE IF NOT EXISTS support_tickets (
    id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number            TEXT UNIQUE,
    user_id                  UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email               TEXT NOT NULL,
    user_name                TEXT,
    is_premium               BOOLEAN NOT NULL DEFAULT false,
    subject                  TEXT NOT NULL,
    description              TEXT NOT NULL,
    tool_id                  UUID REFERENCES tools(id) ON DELETE SET NULL,
    tool_name                TEXT,
    category                 TEXT NOT NULL DEFAULT 'other' CHECK (category IN (
                                 'bug_report','feature_request','billing_issue',
                                 'how_to_question','account_issue','performance_issue',
                                 'compliment','other'
                             )),
    priority                 TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN (
                                 'critical','high','medium','low'
                             )),
    sentiment                TEXT NOT NULL DEFAULT 'neutral' CHECK (sentiment IN (
                                 'angry','frustrated','neutral','happy','satisfied'
                             )),
    sentiment_score          INTEGER,
    status                   TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
                                 'open','ai_responded','waiting_user','in_progress',
                                 'resolved','closed','spam'
                             )),
    ai_response              TEXT,
    ai_confidence            INTEGER,
    ai_response_sent         BOOLEAN NOT NULL DEFAULT false,
    resolution_notes         TEXT,
    resolved_by              TEXT,
    first_response_at        TIMESTAMP WITH TIME ZONE,
    resolved_at              TIMESTAMP WITH TIME ZONE,
    resolution_time_hours    DECIMAL(8,2),
    sla_deadline             TIMESTAMP WITH TIME ZONE,
    sla_breached             BOOLEAN NOT NULL DEFAULT false,
    duplicate_of             UUID REFERENCES support_tickets(id) ON DELETE SET NULL,
    tags                     JSONB NOT NULL DEFAULT '[]',
    created_at               TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. ticket_messages
CREATE TABLE IF NOT EXISTS ticket_messages (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id      UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_type    TEXT NOT NULL CHECK (sender_type IN ('user','ai','human_agent')),
    sender_email   TEXT,
    message        TEXT NOT NULL,
    ai_generated   BOOLEAN NOT NULL DEFAULT false,
    ai_approved    BOOLEAN NOT NULL DEFAULT false,
    is_internal    BOOLEAN NOT NULL DEFAULT false,
    created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. bug_reports
CREATE TABLE IF NOT EXISTS bug_reports (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id            UUID REFERENCES support_tickets(id) ON DELETE SET NULL,
    tool_id              UUID REFERENCES tools(id) ON DELETE SET NULL,
    tool_name            TEXT,
    bug_title            TEXT NOT NULL,
    bug_description      TEXT NOT NULL,
    severity             TEXT NOT NULL DEFAULT 'minor' CHECK (severity IN (
                             'critical','major','minor','cosmetic'
                         )),
    affected_feature     TEXT,
    steps_to_reproduce   TEXT,
    expected_behavior    TEXT,
    actual_behavior      TEXT,
    report_count         INT NOT NULL DEFAULT 1,
    affected_users       INT NOT NULL DEFAULT 1,
    similar_bug_id       UUID REFERENCES bug_reports(id) ON DELETE SET NULL,
    status               TEXT NOT NULL DEFAULT 'new' CHECK (status IN (
                             'new','confirmed','in_progress','fixed',
                             'wont_fix','duplicate'
                         )),
    fixed_in_version     TEXT,
    created_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 4. feature_requests
CREATE TABLE IF NOT EXISTS feature_requests (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id            UUID REFERENCES support_tickets(id) ON DELETE SET NULL,
    tool_id              UUID REFERENCES tools(id) ON DELETE SET NULL,
    tool_name            TEXT,
    feature_title        TEXT NOT NULL,
    feature_description  TEXT NOT NULL,
    vote_count           INT NOT NULL DEFAULT 1,
    voter_emails         JSONB NOT NULL DEFAULT '[]',
    category             TEXT NOT NULL DEFAULT 'new_feature' CHECK (category IN (
                             'new_feature','improvement','integration',
                             'performance','ui_ux'
                         )),
    feasibility_score    INT,
    impact_score         INT,
    priority_score       INT,
    status               TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN (
                             'submitted','under_review','planned',
                             'in_progress','completed','declined'
                         )),
    planned_for          TEXT,
    created_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 5. knowledge_base
CREATE TABLE IF NOT EXISTS knowledge_base (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tool_id              UUID REFERENCES tools(id) ON DELETE SET NULL,
    tool_name            TEXT,
    title                TEXT NOT NULL,
    slug                 TEXT UNIQUE,
    content              TEXT NOT NULL,
    category             TEXT NOT NULL CHECK (category IN (
                             'getting_started','how_to','troubleshooting',
                             'billing','faq','best_practices'
                         )),
    view_count           INT NOT NULL DEFAULT 0,
    helpful_count        INT NOT NULL DEFAULT 0,
    not_helpful_count    INT NOT NULL DEFAULT 0,
    helpfulness_rate     DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    meta_description     TEXT,
    tags                 JSONB NOT NULL DEFAULT '[]',
    ai_generated         BOOLEAN NOT NULL DEFAULT true,
    based_on_tickets     JSONB NOT NULL DEFAULT '[]',
    status               TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
                             'draft','published','outdated'
                         )),
    published_at         TIMESTAMP WITH TIME ZONE,
    created_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 6. support_surveys
CREATE TABLE IF NOT EXISTS support_surveys (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id            UUID REFERENCES support_tickets(id) ON DELETE SET NULL,
    user_email           TEXT,
    csat_score           INT CHECK (csat_score BETWEEN 1 AND 5),
    nps_score            INT,
    feedback_text        TEXT,
    feedback_sentiment   TEXT,
    submitted_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 7. support_analytics
CREATE TABLE IF NOT EXISTS support_analytics (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    period_date                 DATE NOT NULL UNIQUE,
    tickets_opened              INT NOT NULL DEFAULT 0,
    tickets_resolved            INT NOT NULL DEFAULT 0,
    tickets_pending             INT NOT NULL DEFAULT 0,
    avg_first_response_hours    DECIMAL(8,2),
    avg_resolution_hours        DECIMAL(8,2),
    avg_csat_score              DECIMAL(3,2),
    sla_breach_count            INT NOT NULL DEFAULT 0,
    by_category                 JSONB NOT NULL DEFAULT '{}',
    top_bugs                    JSONB NOT NULL DEFAULT '[]',
    top_requests                JSONB NOT NULL DEFAULT '[]',
    ai_resolution_rate          DECIMAL(5,2),
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Sequence + Trigger: auto ticket number
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START 1 INCREMENT 1;

CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.ticket_number := 'AWE-' || LPAD(nextval('ticket_number_seq')::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_ticket_number ON support_tickets;
CREATE TRIGGER trg_generate_ticket_number
    BEFORE INSERT ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION generate_ticket_number();

-- ============================================================
-- updated_at triggers
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tickets_updated_at ON support_tickets;
CREATE TRIGGER trg_tickets_updated_at
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_bugs_updated_at ON bug_reports;
CREATE TRIGGER trg_bugs_updated_at
    BEFORE UPDATE ON bug_reports
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_kb_updated_at ON knowledge_base;
CREATE TRIGGER trg_kb_updated_at
    BEFORE UPDATE ON knowledge_base
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_tickets_status   ON support_tickets(status, priority);
CREATE INDEX IF NOT EXISTS idx_tickets_user     ON support_tickets(user_email);
CREATE INDEX IF NOT EXISTS idx_tickets_created  ON support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_ticket  ON ticket_messages(ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_bugs_status      ON bug_reports(status, severity);
CREATE INDEX IF NOT EXISTS idx_features_votes   ON feature_requests(vote_count DESC, status);
CREATE INDEX IF NOT EXISTS idx_kb_category      ON knowledge_base(category, status);
CREATE INDEX IF NOT EXISTS idx_surveys_ticket   ON support_surveys(ticket_id);
