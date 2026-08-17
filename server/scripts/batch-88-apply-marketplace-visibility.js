/**
 * batch-88-apply-marketplace-visibility.js
 *
 * Data changes for docs/batches/batch-88-plan.md — hides duplicate/shadow
 * cards from Dashboard Marketplace without touching public /tools/:slug
 * pages (those are gated by `approved`, untouched here; Marketplace's AI
 * Tools tab is separately gated by the new `marketplace_visible` column
 * from migration 043, which must be applied in Supabase SQL Editor first).
 *
 * Dry-run by default — prints what would change without writing.
 * Run:   node server/scripts/batch-88-apply-marketplace-visibility.js
 * Apply: node server/scripts/batch-88-apply-marketplace-visibility.js --apply
 */

'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const supabase = require('../db/supabase');

// Group A (has_dedicated_component=true — pure duplicates of hand-built /tools pages)
// + Group B (has_dedicated_component=false — no dedicated page, public page stays via `approved`)
const HIDE_FROM_MARKETPLACE_NAMES = [
  'Capital Gains Calculator',
  'HRA Calculator',
  'NPS Calculator',
  'Online Text Editor',
  'Final Price Calculator',
  'Simple Word Counter',
  'Second Brain PKM System',
];

const PKM_PRODUCT_TITLE    = 'Second Brain PKM System';
const RESUME_PRODUCT_TITLE = 'Resume Template Pack';
const RESUME_PRICE         = 149;

async function main() {
  const apply = process.argv.includes('--apply');

  // ── 1. tools.marketplace_visible = false for the 7 named rows ──────────
  const { data: toolRows, error: toolsErr } = await supabase
    .from('tools')
    .select('id, name, slug, marketplace_visible')
    .in('name', HIDE_FROM_MARKETPLACE_NAMES);
  if (toolsErr) {
    if (/marketplace_visible/i.test(toolsErr.message)) {
      throw new Error(
        `${toolsErr.message}\n[batch-88] marketplace_visible column not found — ` +
        `run server/db/migrations/043_tools_marketplace_visible.sql in Supabase SQL Editor first.`
      );
    }
    throw new Error(`tools lookup failed: ${toolsErr.message}`);
  }

  const toolsToHide = (toolRows || []).filter((r) => r.marketplace_visible !== false);
  console.log(`[batch-88] tools rows matched: ${toolRows?.length ?? 0}`);
  console.log(`[batch-88] tools rows to set marketplace_visible=false: ${toolsToHide.length}`);
  for (const row of toolsToHide) {
    console.log(`  - ${row.slug} — ${row.name}`);
  }

  // ── 2. digital_products: Second Brain PKM System -> is_published=false ─
  const { data: pkmRows, error: pkmErr } = await supabase
    .from('digital_products')
    .select('id, title, is_published')
    .eq('title', PKM_PRODUCT_TITLE);
  if (pkmErr) throw new Error(`PKM product lookup failed: ${pkmErr.message}`);

  const pkmToUnpublish = (pkmRows || []).filter((r) => r.is_published !== false);
  console.log(`\n[batch-88] digital_products "${PKM_PRODUCT_TITLE}" rows to unpublish: ${pkmToUnpublish.length}`);
  for (const row of pkmToUnpublish) {
    console.log(`  - ${row.id}`);
  }

  // ── 3. digital_products: dedupe Resume Template Pack, set price=149 ────
  const { data: resumeRows, error: resumeErr } = await supabase
    .from('digital_products')
    .select('id, title, price, is_published, created_at')
    .eq('title', RESUME_PRODUCT_TITLE)
    .order('created_at', { ascending: true });
  if (resumeErr) throw new Error(`Resume product lookup failed: ${resumeErr.message}`);

  let resumeKeepId = null;
  let resumeDeleteIds = [];
  if ((resumeRows || []).length > 1) {
    resumeKeepId = resumeRows[0].id; // keep the earliest row
    resumeDeleteIds = resumeRows.slice(1).map((r) => r.id);
  } else if ((resumeRows || []).length === 1) {
    resumeKeepId = resumeRows[0].id;
  }

  console.log(`\n[batch-88] "${RESUME_PRODUCT_TITLE}" rows found: ${resumeRows?.length ?? 0}`);
  if (resumeDeleteIds.length) {
    console.log(`[batch-88] will delete duplicate row(s): ${resumeDeleteIds.join(', ')}`);
  }
  if (resumeKeepId) {
    console.log(`[batch-88] will keep row ${resumeKeepId}, set price=${RESUME_PRICE} (is_published left unchanged — NOT published by this script)`);
  } else {
    console.log('[batch-88] no Resume Template Pack row found — nothing to update.');
  }

  if (!apply) {
    console.log('\n[batch-88] Dry run only — no rows written. Re-run with --apply to write.');
    return;
  }

  if (toolsToHide.length > 0) {
    const { error } = await supabase
      .from('tools')
      .update({ marketplace_visible: false })
      .in('id', toolsToHide.map((r) => r.id));
    if (error) throw new Error(`tools update failed: ${error.message}`);
    console.log(`\n[batch-88] Updated ${toolsToHide.length} tools rows.`);
  }

  if (pkmToUnpublish.length > 0) {
    const { error } = await supabase
      .from('digital_products')
      .update({ is_published: false })
      .in('id', pkmToUnpublish.map((r) => r.id));
    if (error) throw new Error(`PKM product update failed: ${error.message}`);
    console.log(`[batch-88] Unpublished ${pkmToUnpublish.length} "${PKM_PRODUCT_TITLE}" row(s).`);
  }

  if (resumeDeleteIds.length > 0) {
    const { error } = await supabase.from('digital_products').delete().in('id', resumeDeleteIds);
    if (error) throw new Error(`Resume duplicate delete failed: ${error.message}`);
    console.log(`[batch-88] Deleted ${resumeDeleteIds.length} duplicate "${RESUME_PRODUCT_TITLE}" row(s).`);
  }

  if (resumeKeepId) {
    const { error } = await supabase
      .from('digital_products')
      .update({ price: RESUME_PRICE })
      .eq('id', resumeKeepId);
    if (error) throw new Error(`Resume price update failed: ${error.message}`);
    console.log(`[batch-88] Set price=${RESUME_PRICE} on "${RESUME_PRODUCT_TITLE}" row ${resumeKeepId}.`);
  }
}

main().catch((err) => {
  console.error('[batch-88] FATAL:', err.message);
  process.exit(1);
});
