-- ═══════════════════════════════════════════════════════════════
-- AWE-OS — Testing Agent + Auto Approval Schema Migration
-- Run in Supabase SQL Editor.
-- All statements are idempotent (IF NOT EXISTS / safe defaults).
-- ═══════════════════════════════════════════════════════════════

-- ── TABLE: tool_tests ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tool_tests (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id    UUID        REFERENCES public.saas_tools(id) ON DELETE CASCADE,
  api_ok     BOOLEAN     DEFAULT false,
  ui_ok      BOOLEAN     DEFAULT false,
  test_score INTEGER     DEFAULT 0,
  status     TEXT        CHECK (status IN ('pass','partial','fail')) DEFAULT 'fail',
  result     JSONB       DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tool_tests_tool_id
  ON public.tool_tests(tool_id);

CREATE INDEX IF NOT EXISTS idx_tool_tests_created_at
  ON public.tool_tests(created_at DESC);

-- ── ADD: quality columns to saas_tools ───────────────────────
ALTER TABLE public.saas_tools
  ADD COLUMN IF NOT EXISTS quality_score    INTEGER DEFAULT 0;

ALTER TABLE public.saas_tools
  ADD COLUMN IF NOT EXISTS approval_status TEXT
    CHECK (approval_status IN ('pending','auto_live','review','rejected'))
    DEFAULT 'pending';

-- ── ADD: quality columns to tools (pipeline) ─────────────────
ALTER TABLE public.tools
  ADD COLUMN IF NOT EXISTS quality_score    INTEGER DEFAULT 0;

ALTER TABLE public.tools
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending';

-- ── VERIFY ───────────────────────────────────────────────────
-- SELECT name, quality_score, approval_status, is_published
-- FROM public.saas_tools ORDER BY created_at DESC;

-- SELECT name, status, quality_score, approval_status
-- FROM public.tools ORDER BY created_at DESC;

-- SELECT tool_id, test_score, status FROM public.tool_tests ORDER BY created_at DESC;
