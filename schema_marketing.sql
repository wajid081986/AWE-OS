-- ============================================================
-- AWE-OS v2 — Marketing Schema
-- schema_marketing.sql
-- ============================================================

-- 1. blog_posts
CREATE TABLE IF NOT EXISTS blog_posts (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tool_id              UUID REFERENCES tools(id) ON DELETE SET NULL,
    tool_name            TEXT,
    title                TEXT NOT NULL,
    slug                 TEXT NOT NULL UNIQUE,
    excerpt              TEXT,
    content              TEXT,
    meta_title           TEXT,
    meta_description     TEXT,
    focus_keyword        TEXT,
    secondary_keywords   JSONB NOT NULL DEFAULT '[]',
    content_type         TEXT NOT NULL CHECK (content_type IN (
                             'how_to_guide','listicle','case_study',
                             'comparison','thought_leadership','product_update',
                             'press_release','tutorial'
                         )),
    target_audience      TEXT,
    word_count           INT NOT NULL DEFAULT 0,
    read_time_minutes    INT NOT NULL DEFAULT 0,
    seo_score            INT NOT NULL DEFAULT 0,
    readability_score    INT NOT NULL DEFAULT 0,
    internal_links       JSONB NOT NULL DEFAULT '[]',
    cta_text             TEXT,
    cta_url              TEXT,
    status               TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
                             'draft','review','approved','published','archived'
                         )),
    published_at         TIMESTAMP WITH TIME ZONE,
    views                INT NOT NULL DEFAULT 0,
    organic_clicks       INT NOT NULL DEFAULT 0,
    avg_time_on_page     INT NOT NULL DEFAULT 0,
    created_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. newsletters
CREATE TABLE IF NOT EXISTS newsletters (
    id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_name            TEXT NOT NULL,
    subject_line             TEXT NOT NULL,
    preview_text             TEXT,
    hero_headline            TEXT,
    hero_body                TEXT,
    sections                 JSONB NOT NULL DEFAULT '[]',
    target_segment           TEXT NOT NULL DEFAULT 'all_users' CHECK (target_segment IN (
                                 'all_users','free_users','premium_users',
                                 'inactive_users','new_users'
                             )),
    estimated_recipients     INT NOT NULL DEFAULT 0,
    predicted_open_rate      DECIMAL(5,2),
    predicted_click_rate     DECIMAL(5,2),
    actual_open_rate         DECIMAL(5,2),
    actual_click_rate        DECIMAL(5,2),
    unsubscribe_rate         DECIMAL(5,2),
    status                   TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
                                 'draft','approved','scheduled','sent'
                             )),
    scheduled_for            TIMESTAMP WITH TIME ZONE,
    sent_at                  TIMESTAMP WITH TIME ZONE,
    created_at               TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. referral_program
CREATE TABLE IF NOT EXISTS referral_program (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_user_id     UUID,
    referrer_email       TEXT,
    referral_code        TEXT UNIQUE,
    referrer_reward      TEXT NOT NULL DEFAULT '1 month free',
    referee_reward       TEXT NOT NULL DEFAULT '20% off first month',
    reward_type          TEXT NOT NULL DEFAULT 'discount' CHECK (reward_type IN (
                             'discount','free_month','cash','credits'
                         )),
    clicks               INT NOT NULL DEFAULT 0,
    signups              INT NOT NULL DEFAULT 0,
    conversions          INT NOT NULL DEFAULT 0,
    total_earned         DECIMAL(10,2) NOT NULL DEFAULT 0,
    status               TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
                             'active','paused','expired'
                         )),
    expires_at           TIMESTAMP WITH TIME ZONE,
    created_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 4. referral_conversions
CREATE TABLE IF NOT EXISTS referral_conversions (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referral_id          UUID REFERENCES referral_program(id) ON DELETE SET NULL,
    referral_code        TEXT,
    referee_email        TEXT,
    referee_user_id      UUID,
    clicked_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    signed_up_at         TIMESTAMP WITH TIME ZONE,
    paid_at              TIMESTAMP WITH TIME ZONE,
    revenue_amount       DECIMAL(10,2) NOT NULL DEFAULT 0,
    status               TEXT NOT NULL DEFAULT 'clicked' CHECK (status IN (
                             'clicked','signed_up','converted','refunded'
                         ))
);

-- 5. ad_copy
CREATE TABLE IF NOT EXISTS ad_copy (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tool_id              UUID REFERENCES tools(id) ON DELETE SET NULL,
    tool_name            TEXT,
    platform             TEXT NOT NULL CHECK (platform IN (
                             'google_search','google_display','meta_facebook',
                             'meta_instagram','twitter','linkedin'
                         )),
    ad_type              TEXT NOT NULL CHECK (ad_type IN (
                             'headline','description','full_ad',
                             'carousel_slide','video_script'
                         )),
    headline_1           TEXT,
    headline_2           TEXT,
    headline_3           TEXT,
    description_1        TEXT,
    description_2        TEXT,
    primary_text         TEXT,
    image_prompt         TEXT,
    target_keywords      JSONB NOT NULL DEFAULT '[]',
    target_audience      TEXT,
    quality_score        INT,
    relevance_score      INT,
    status               TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
                             'draft','approved','active','paused','archived'
                         )),
    impressions          INT NOT NULL DEFAULT 0,
    clicks               INT NOT NULL DEFAULT 0,
    conversions          INT NOT NULL DEFAULT 0,
    spend                DECIMAL(10,2) NOT NULL DEFAULT 0,
    ctr                  DECIMAL(5,2) NOT NULL DEFAULT 0,
    created_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 6. influencer_outreach
CREATE TABLE IF NOT EXISTS influencer_outreach (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                 TEXT NOT NULL,
    handle               TEXT,
    platform             TEXT NOT NULL CHECK (platform IN (
                             'youtube','instagram','twitter','linkedin','tiktok','blog'
                         )),
    niche                TEXT,
    followers            INT NOT NULL DEFAULT 0,
    engagement_rate      DECIMAL(5,2) NOT NULL DEFAULT 0,
    email                TEXT,
    contact_method       TEXT,
    collab_type          TEXT NOT NULL DEFAULT 'product_review' CHECK (collab_type IN (
                             'sponsored_post','product_review',
                             'affiliate','barter','ambassador'
                         )),
    outreach_subject     TEXT,
    outreach_message     TEXT,
    status               TEXT NOT NULL DEFAULT 'identified' CHECK (status IN (
                             'identified','message_drafted','contacted',
                             'negotiating','active','completed','declined'
                         )),
    post_url             TEXT,
    reach_achieved       INT NOT NULL DEFAULT 0,
    revenue_attributed   DECIMAL(10,2) NOT NULL DEFAULT 0,
    contacted_at         TIMESTAMP WITH TIME ZONE,
    created_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 7. competitor_comparisons
CREATE TABLE IF NOT EXISTS competitor_comparisons (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tool_id              UUID REFERENCES tools(id) ON DELETE SET NULL,
    our_tool_name        TEXT,
    competitor_name      TEXT NOT NULL,
    competitor_url       TEXT,
    page_title           TEXT,
    comparison_table     JSONB NOT NULL DEFAULT '[]',
    our_advantages       JSONB NOT NULL DEFAULT '[]',
    their_advantages     JSONB NOT NULL DEFAULT '[]',
    conclusion_text      TEXT,
    cta_text             TEXT,
    slug                 TEXT NOT NULL UNIQUE,
    meta_title           TEXT,
    meta_description     TEXT,
    target_keyword       TEXT,
    status               TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
                             'draft','approved','published'
                         )),
    created_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 8. content_calendar
CREATE TABLE IF NOT EXISTS content_calendar (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_type         TEXT NOT NULL CHECK (content_type IN (
                             'blog_post','newsletter','social_post',
                             'video','podcast','webinar','ad_campaign'
                         )),
    title                TEXT NOT NULL,
    description          TEXT,
    planned_date         DATE,
    planned_time         TIME,
    tool_id              UUID REFERENCES tools(id) ON DELETE SET NULL,
    platform             TEXT,
    content_id           UUID,
    priority             TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN (
                             'must_publish','high','medium','low'
                         )),
    status               TEXT NOT NULL DEFAULT 'planned' CHECK (status IN (
                             'planned','in_progress','ready',
                             'published','postponed','cancelled'
                         )),
    notes                TEXT,
    created_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 9. marketing_campaigns
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_name        TEXT NOT NULL,
    campaign_type        TEXT NOT NULL CHECK (campaign_type IN (
                             'product_launch','seasonal','referral_drive',
                             'content_series','paid_acquisition','reactivation','brand_awareness'
                         )),
    tool_id              UUID REFERENCES tools(id) ON DELETE SET NULL,
    goal_type            TEXT,
    goal_target          DECIMAL(12,2),
    budget_total         DECIMAL(10,2) NOT NULL DEFAULT 0,
    budget_spent         DECIMAL(10,2) NOT NULL DEFAULT 0,
    start_date           DATE,
    end_date             DATE,
    actual_signups       INT NOT NULL DEFAULT 0,
    actual_revenue       DECIMAL(12,2) NOT NULL DEFAULT 0,
    roi                  DECIMAL(8,2) NOT NULL DEFAULT 0,
    status               TEXT NOT NULL DEFAULT 'planning' CHECK (status IN (
                             'planning','active','paused','completed','cancelled'
                         )),
    campaign_brief       TEXT,
    created_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_blog_status      ON blog_posts(status, content_type);
CREATE INDEX IF NOT EXISTS idx_blog_tool        ON blog_posts(tool_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_newsletter_status ON newsletters(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_referral_code    ON referral_program(referral_code);
CREATE INDEX IF NOT EXISTS idx_ad_copy_platform ON ad_copy(platform, status);
CREATE INDEX IF NOT EXISTS idx_calendar_date    ON content_calendar(planned_date, status);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON marketing_campaigns(status, start_date);

-- ============================================================
-- REFERRAL CODE AUTO-GENERATION
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS referral_seq START 10000 INCREMENT 1;

CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.referral_code IS NULL THEN
        NEW.referral_code := 'AWE-REF-' || UPPER(SUBSTR(MD5(
            COALESCE(NEW.referrer_email, '') || nextval('referral_seq')::TEXT
        ), 1, 6));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_referral_code ON referral_program;
CREATE TRIGGER trg_generate_referral_code
    BEFORE INSERT ON referral_program
    FOR EACH ROW
    EXECUTE FUNCTION generate_referral_code();
