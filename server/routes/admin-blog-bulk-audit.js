const express     = require('express');
const supabase     = require('../db/supabase');
const requireAuth  = require('../middleware/auth');

const router = express.Router();

const MIN_WORD_COUNT   = 800;
const MIN_HUMAN_SCORE  = 70;
const INTERNAL_LINK_RE = /href=(['"])\/(?!\/)[^'"]*\1/i;

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

module.exports = router;
