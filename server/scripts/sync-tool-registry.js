/**
 * sync-tool-registry.js
 *
 * The Marketing Agent's weekly blog cron reads server/jobs/marketing.cron.js
 * fetchActiveTools() -> supabase.from('tools').eq('status', 'live'). Only 2
 * rows in that table currently have status='live' (the rest are AI-generated
 * pipeline ideas), so the cron has almost nothing to write blog posts for.
 *
 * The 55+ real, shipped tools live in client/src/data/toolRegistry.js
 * (TOOL_REGISTRY) and are not represented in the `tools` table at all.
 * This script inserts them as status='live' rows so the Marketing Agent has
 * real tools to generate content for.
 *
 * Dry-run by default — prints what would be inserted/skipped without writing.
 * Run: node server/scripts/sync-tool-registry.js
 * Apply: node server/scripts/sync-tool-registry.js --apply
 */

'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const path = require('path');
const supabase = require('../db/supabase');

const REGISTRY_PATH = path.resolve(__dirname, '../../client/src/data/toolRegistry.js');
// tools.source has a CHECK constraint allowing only 'manual' or 'ai' (schema_idea_pipeline.sql).
// These are hand-built shipped tools, not AI pipeline output, so 'manual' is correct.
const SOURCE_TAG = 'manual';

// Dev/test fixtures in toolRegistry.js that are not real shipped tools and
// must never be synced as status='live' (would generate a blog post for them).
const EXCLUDED_SLUGS = new Set(['test-ai-tool']);

async function loadRegistryTools() {
  const mod = await import(`file://${REGISTRY_PATH.replace(/\\/g, '/')}`);
  return mod.getAllTools() // excludes comingSoon tools
    .filter((tool) => !EXCLUDED_SLUGS.has(tool.slug));
}

async function fetchExistingSlugs() {
  const { data, error } = await supabase.from('tools').select('slug').not('slug', 'is', null);
  if (error) throw new Error(`Failed to fetch existing tools: ${error.message}`);
  return new Set((data || []).map((row) => row.slug));
}

function toRow(tool) {
  return {
    name: tool.name,
    slug: tool.slug,
    category: tool.category || null,
    description: tool.description || null,
    status: 'live',
    // approved (not status) gates public visibility on /tools — GET /api/tools/public
    // filters on it. status='live' alone left these tools invisible on the public site
    // for 12 days (2026-07-03 to 2026-07-15) before this line was added.
    approved: true,
    is_free: true,
    source: SOURCE_TAG,
  };
}

async function main() {
  const apply = process.argv.includes('--apply');

  const registryTools = await loadRegistryTools();
  const existingSlugs = await fetchExistingSlugs();

  const toInsert = registryTools
    .filter((tool) => !existingSlugs.has(tool.slug))
    .map(toRow);
  const skipped = registryTools.filter((tool) => existingSlugs.has(tool.slug));

  console.log(`[sync] Registry tools found:      ${registryTools.length}`);
  console.log(`[sync] Already in tools table:    ${skipped.length}`);
  console.log(`[sync] New rows to insert:        ${toInsert.length}`);

  if (toInsert.length > 0) {
    console.log('\n[sync] Will insert (slug — name — category):');
    for (const row of toInsert) {
      console.log(`  - ${row.slug} — ${row.name} — ${row.category}`);
    }
  }

  if (!apply) {
    console.log('\n[sync] Dry run only — no rows written. Re-run with --apply to insert.');
    return;
  }

  if (toInsert.length === 0) {
    console.log('\n[sync] Nothing to insert.');
    return;
  }

  const { data, error } = await supabase.from('tools').insert(toInsert).select('id, slug');
  if (error) {
    throw new Error(`Insert failed: ${error.message}`);
  }
  console.log(`\n[sync] Inserted ${data.length} rows into tools (status='live').`);
}

main().catch((err) => {
  console.error('[sync] FATAL:', err.message);
  process.exit(1);
});
