const express     = require('express');
const supabase     = require('../db/supabase');
const requireAuth  = require('../middleware/auth');
const {
  generatePostContent,
  humanizeParagraphsChunked,
  extractParagraphs,
  applyHumanizedParagraphs,
} = require('./admin-blog');

const router = express.Router();

const MIN_WORD_COUNT   = 800;
const MIN_HUMAN_SCORE  = 70;
const INTERNAL_LINK_RE = /href=(['"])\/(?!\/)[^'"]*\1/i;

// Flags fixable by full content regeneration vs. humanize-only — see
// CLAUDE.md changelog 2026-08-07 (Bulk SEO Audit Fix integration).
const REGENERATE_FLAGS       = new Set(['thin_content', 'no_faq', 'no_internal_links']);
const FIX_REGENERATE_WORDS   = 1800;

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
}

function blockText(content) {
  if (!Array.isArray(content)) return '';
  return content.map(block => block?.text || '').join(' ');
}

function countWords(rawText) {
  const stripped = rawText.replace(/<[^>]*>/g, ' ').trim();
  if (!stripped) return 0;
  return stripped.split(/\s+/).length;
}

function auditPost(post) {
  const rawText   = blockText(post.content);
  const wordCount = countWords(rawText);
  const flags     = [];

  if (wordCount < MIN_WORD_COUNT) flags.push('thin_content');
  if (!Array.isArray(post.faqs) || post.faqs.length === 0) flags.push('no_faq');
  if (!INTERNAL_LINK_RE.test(rawText)) flags.push('no_internal_links');
  if (post.human_score == null || post.human_score < MIN_HUMAN_SCORE) flags.push('not_humanized');

  return {
    id:          post.id,
    title:       post.title,
    slug:        post.slug,
    category:    post.category,
    wordCount,
    issuesCount: flags.length,
    flags,
  };
}

// ── GET / ────────────────────────────────────────────────────────────────────
// Bulk structural/heuristic audit across all published posts. No AI calls —
// safe and free to re-run anytime.

router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('id, title, slug, category, content, faqs, human_score')
      .eq('status', 'published');

    if (error) throw error;

    const posts = (data || [])
      .map(auditPost)
      .sort((a, b) => b.issuesCount - a.issuesCount);

    const summary = {
      totalPosts:  posts.length,
      totalIssues: posts.reduce((sum, p) => sum + p.issuesCount, 0),
    };

    res.json({ success: true, posts, summary });
  } catch (err) {
    console.error('[admin-blog-bulk-audit/GET]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /fix/:id — preview only, does NOT persist ────────────────────────────
// Regenerates or re-humanizes a flagged post's content/faqs targeting the
// SAME post (its own title/category/target_keyword) — never a new topic.
// Returns a preview for the client to review before /fix/:id/confirm writes
// anything. See CLAUDE.md changelog 2026-08-07.

router.post('/fix/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data: post, error } = await supabase
      .from('blog_posts')
      .select('id, slug, title, category, content, faqs, human_score, target_keyword, related_tools')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    if (!post) return res.status(404).json({ success: false, error: 'Post not found' });

    const { flags } = auditPost(post);
    const mode = req.body?.mode || (
      flags.some(f => REGENERATE_FLAGS.has(f)) ? 'regenerate' :
      flags.includes('not_humanized')          ? 'humanize'   :
      null
    );
    if (!mode) return res.json({ success: false, error: 'No fixable issues on this post' });
    if (mode !== 'regenerate' && mode !== 'humanize') {
      return res.status(400).json({ success: false, error: `Unknown mode "${mode}"` });
    }

    if (mode === 'regenerate') {
      const promotedTool = Array.isArray(post.related_tools) ? post.related_tools[0] : null;
      const result = await generatePostContent({
        topic:        post.title,
        keyword:      post.target_keyword || post.title,
        toolSlug:     promotedTool?.slug,
        toolName:     promotedTool?.label,
        wordCount:    FIX_REGENERATE_WORDS,
        category:     post.category,
        autoHumanize: true,
      });
      if (!result.success) return res.json({ success: false, error: result.error });

      return res.json({
        success: true,
        mode:    'regenerate',
        preview: {
          content:      result.post.content,
          faqs:         result.post.faqs,
          wordCount:    result.actualWords,
          humanizeInfo: result.humanize,
        },
      });
    }

    // mode === 'humanize' — reuses the same chunked paragraph-only humanize
    // as Published Posts' per-post humanize action.
    const blocks     = Array.isArray(post.content) ? post.content : [];
    const paragraphs = extractParagraphs(blocks);
    if (paragraphs.length === 0) {
      return res.json({ success: false, error: 'No paragraph text found to humanize' });
    }

    const { markerIntegrity, humanizedParagraphs, scores } = await humanizeParagraphsChunked(paragraphs, {
      tone: 'conversational', targetAudience: 'Indian professionals',
    });
    if (!markerIntegrity) {
      return res.json({ success: false, error: 'Marker round-trip failed — kept the original draft.' });
    }

    res.json({
      success: true,
      mode:    'humanize',
      preview: {
        content:      applyHumanizedParagraphs(blocks, humanizedParagraphs),
        humanizeInfo: { applied: true, scores },
      },
    });
  } catch (err) {
    console.error('[admin-blog-bulk-audit/fix/:id]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /fix/:id/confirm — commits a previously returned preview ────────────
// UPDATE only — never INSERT, never touches slug/title/excerpt/meta_description.
// The client must pass back the exact preview it received from /fix/:id.

router.post('/fix/:id/confirm', requireAuth, requireAdmin, async (req, res) => {
  const { mode, preview } = req.body || {};
  if (!preview || !Array.isArray(preview.content)) {
    return res.status(400).json({ success: false, error: 'preview.content (array) is required' });
  }
  if (mode !== 'regenerate' && mode !== 'humanize') {
    return res.status(400).json({ success: false, error: 'mode must be "regenerate" or "humanize"' });
  }
  if (mode === 'regenerate' && !Array.isArray(preview.faqs)) {
    return res.status(400).json({ success: false, error: 'preview.faqs (array) is required for regenerate mode' });
  }

  const updates = {
    content:    preview.content,
    updated_at: new Date().toISOString(),
    ...(mode === 'regenerate' ? { faqs: preview.faqs } : {}),
  };
  if (preview.humanizeInfo?.applied && preview.humanizeInfo?.scores) {
    updates.ai_score     = preview.humanizeInfo.scores.afterHumanization ?? null;
    updates.human_score  = preview.humanizeInfo.scores.humanScore ?? null;
    updates.humanized_at = new Date().toISOString();
  }

  try {
    const { error } = await supabase
      .from('blog_posts')
      .update(updates)
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('[admin-blog-bulk-audit/fix/:id/confirm]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
