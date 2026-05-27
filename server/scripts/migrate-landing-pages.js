/**
 * migrate-landing-pages.js
 * Run: node server/scripts/migrate-landing-pages.js
 *
 * If Supabase RPC exec_sql is not available (most hosted plans),
 * the script prints the SQL to copy into Supabase SQL Editor.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const sql = `
CREATE TABLE IF NOT EXISTS landing_pages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID,
  title           TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  brief           JSONB NOT NULL DEFAULT '{}',
  html_content    TEXT,
  preview_url     TEXT,
  variants        JSONB DEFAULT '[]',
  views           INTEGER DEFAULT 0,
  conversions     INTEGER DEFAULT 0,
  status          TEXT DEFAULT 'draft',
  style_preset    TEXT DEFAULT 'modern-saas',
  generation_score JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  published_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_landing_pages_slug   ON landing_pages(slug);
CREATE INDEX IF NOT EXISTS idx_landing_pages_user   ON landing_pages(user_id);
CREATE INDEX IF NOT EXISTS idx_landing_pages_status ON landing_pages(status);
`;

async function migrate() {
  console.log('[migrate] Attempting via Supabase RPC...');

  const { error } = await supabase
    .rpc('exec_sql', { sql })
    .catch(() => ({ error: 'rpc not available' }));

  if (error) {
    console.log('[migrate] RPC not available — paste the SQL below into Supabase SQL Editor:');
    console.log('\n─────────────────────────────────────────────────────────────────\n');
    console.log(sql);
    console.log('\n─────────────────────────────────────────────────────────────────\n');
    console.log('[migrate] URL: https://supabase.com/dashboard → SQL Editor → New Query → paste above');
  } else {
    console.log('[migrate] ✅ landing_pages table created successfully');
  }
}

migrate();
