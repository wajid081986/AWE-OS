# Batch 62 — AI Factory `product_type` schema migration (SDD Phase 1 §4.2)

Source: `docs/sdd/AWE-OS_AI-Factory_Advancement-SDD.md`, Phase 1, §4.2 only.

## Plan: Phase 1 §4.2 — `product_type` schema migration

**File to create:** `server/db/migrations/040_ai_factory_product_type.sql` (040 is the next free number after `039_gsc_daily_stats.sql`)

**Content** (matches SDD §4.2 exactly, using the repo's existing migration idioms — `IF NOT EXISTS` guards + `NOTIFY pgrst` seen in every recent migration):
```sql
-- Migration 040: AI Factory product_type foundation (Phase 1)
-- Run in Supabase SQL Editor

ALTER TABLE tools ADD COLUMN IF NOT EXISTS product_type        TEXT  NOT NULL DEFAULT 'prompt-tool';
ALTER TABLE tools ADD COLUMN IF NOT EXISTS asset_url            TEXT;
ALTER TABLE tools ADD COLUMN IF NOT EXISTS packaging_metadata   JSONB;

NOTIFY pgrst, 'reload schema';
```

**Confirmed against the codebase:**
- Target table is `tools` (the AI-Factory/learning-pipeline table `ai-factory.service.js` inserts into), not `saas_tools` — verified by reading `runFactory()`.
- Purely additive: default `'prompt-tool'` means every existing row/code path is unaffected.
- No code changes in this step — §4.3/§4.4 (service + execution branching) are separate later work, not part of §4.2.
- Nothing touches `tools.status`, `builder-agent.js`, `code-generator.js`, `idea-pipeline.js`, or `PipelineOrchestrator`, per §8.

**Process (per CLAUDE.md §6):**
1. Create branch `batch-62-ai-factory-product-type`.
2. First commit on that branch: save this plan verbatim to `docs/batches/batch-62-plan.md`.
3. Second commit: add the migration file. Message: `batch-62: add product_type schema migration (SDD Phase 1 §4.2)`.
4. Do not run this migration against the live Supabase DB — leave it as a manual step for the user to run in the Supabase SQL Editor, and say so explicitly in the summary.
5. No build/lint changes expected since no application code is touched, but run the build to confirm nothing broke.
