const express       = require('express');
const supabase       = require('../db/supabase');
const requireAuth    = require('../middleware/auth');
const { getOpenAI }  = require('../core/ai-engine');
const parseAIJson    = require('../services/parseAIJson');
const {
  generatePostContent,
  humanizeParagraphsChunked,
  extractParagraphs,
  applyHumanizedParagraphs,
} = require('./admin-blog');
const { fetchSearchPerformance } = require('./admin-growth-os');

const router = express.Router();

const MIN_WORD_COUNT   = 800;
const MIN_HUMAN_SCORE  = 70;
const INTERNAL_LINK_RE = /href=(['"])\/(?!\/)[^'"]*\1/i;

// Flags fixable by full content regeneration vs. humanize-only — see
// CLAUDE.md changelog 2026-08-07 (Bulk SEO Audit Fix integration).
const REGENERATE_FLAGS       = new Set(['thin_content', 'no_faq', 'no_internal_links']);
const FIX_REGENERATE_WORDS   = 1800;

// ── CTR Optimizer (Batch 53) ──────────────────────────────────────────────────
const CTR_MIN_IMPRESSIONS = 20;
const CTR_LOW_THRESHOLD   = 0.01; // 1%
const AI_CALL_TIMEOUT_MS  = 90_000;
const BLOG_URL_PREFIX     = 'https://www.awe-os.com/blog/';

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

// ── GET /priority-queue — structural audit + real GSC performance, merged
// into a single ranked list (SDD Phase 2, Batch 59). Read-only, no AI calls.
// Reuses auditPost() and fetchSearchPerformance() rather than duplicating
// either query. Score formula: issuesCount*25 + gscPortion, where gscPortion
// is damped 70% when a post has zero structural flags (nothing for "Fix
// This" to act on) so it can't outrank actually-fixable posts.

const PRIORITY_ISSUE_WEIGHT      = 25;
const PRIORITY_IMPRESSIONS_CAP   = 1000;
const PRIORITY_POSITION_CAP      = 100;
const PRIORITY_ZERO_FLAG_DAMPING = 0.3;

const FLAG_REASON = {
  thin_content:      'Thin content (fewer than 800 words)',
  no_faq:            'Missing FAQ section',
  no_internal_links: 'No internal links',
  not_humanized:     'Not humanized / AI-detectable',
};

function priorityScore(issuesCount, impressions, avgPosition) {
  const gscPortion = Math.min(impressions, PRIORITY_IMPRESSIONS_CAP) / 10
                    + Math.min(avgPosition, PRIORITY_POSITION_CAP);
  const damping = issuesCount === 0 ? PRIORITY_ZERO_FLAG_DAMPING : 1;
  return Math.round(issuesCount * PRIORITY_ISSUE_WEIGHT + gscPortion * damping);
}

router.get('/priority-queue', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('id, title, slug, category, content, faqs, human_score')
      .eq('status', 'published');
    if (error) throw error;

    let perf = null;
    try {
      perf = await fetchSearchPerformance();
    } catch (perfErr) {
      console.error('[admin-blog-bulk-audit/priority-queue] search performance fetch failed:', perfErr.message);
    }
    const pageByUrl = new Map((perf?.last28?.allPages || []).map(p => [p.page_url, p]));

    const posts = (data || [])
      .map(post => {
        const audited = auditPost(post);
        const page    = pageByUrl.get(`${BLOG_URL_PREFIX}${post.slug}`);

        const impressions  = page?.impressions || 0;
        const clicks       = page?.clicks || 0;
        const avgPosition  = page?.avgPosition || 0;
        const needsMetaFix = !!page
          && impressions > CTR_MIN_IMPRESSIONS
          && (clicks === 0 || page.ctr < CTR_LOW_THRESHOLD);

        const reasons = audited.flags.map(f => FLAG_REASON[f] || f);
        if (impressions > 0) {
          reasons.push(`${impressions} impressions (28d) at avg position ${avgPosition}`);
        }
        if (needsMetaFix) {
          reasons.push('Low CTR despite impressions');
        }

        return {
          ...audited,
          impressions,
          clicks,
          avgPosition,
          needsMetaFix,
          score: priorityScore(audited.issuesCount, impressions, avgPosition),
          reasons,
        };
      })
      .sort((a, b) => b.score - a.score);

    const summary = {
      totalPosts: posts.length,
      avgScore:   posts.length ? Number((posts.reduce((sum, p) => sum + p.score, 0) / posts.length).toFixed(1)) : 0,
    };

    res.json({ success: true, configured: !!perf, posts, summary });
  } catch (err) {
    console.error('[admin-blog-bulk-audit/priority-queue]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /ctr-opportunities — published posts with real impressions but
// very low/zero clicks (a title/meta problem, not a ranking problem) ─────────
// Joins blog_posts.slug to gsc_daily_stats.page_url via the confirmed
// canonical-URL pattern. Posts with no GSC match are excluded — no data
// isn't evidence of a CTR problem. See CLAUDE.md changelog 2026-08-07.

router.get('/ctr-opportunities', requireAuth, requireAdmin, async (req, res) => {
  try {
    const perf = await fetchSearchPerformance();
    if (!perf) return res.json({ success: true, configured: false, posts: [] });

    const { data: posts, error } = await supabase
      .from('blog_posts')
      .select('id, slug, title, meta_title, meta_description')
      .eq('status', 'published');
    if (error) throw error;

    const pageByUrl = new Map((perf.last28.allPages || []).map(p => [p.page_url, p]));

    const opportunities = (posts || [])
      .map(post => {
        const page = pageByUrl.get(`${BLOG_URL_PREFIX}${post.slug}`);
        if (!page) return null;
        if (page.impressions <= CTR_MIN_IMPRESSIONS) return null;
        if (!(page.clicks === 0 || page.ctr < CTR_LOW_THRESHOLD)) return null;
        return {
          id:               post.id,
          slug:             post.slug,
          title:            post.title,
          meta_title:       post.meta_title,
          meta_description: post.meta_description,
          impressions:      page.impressions,
          clicks:           page.clicks,
          ctr:              page.ctr,
          topQueries:       page.topQueries || [],
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.impressions - a.impressions);

    res.json({ success: true, configured: true, posts: opportunities });
  } catch (err) {
    console.error('[admin-blog-bulk-audit/ctr-opportunities]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /meta-suggest/:id — preview only, does NOT persist ──────────────────
// One AI call suggesting 2-3 alternative {meta_title, meta_description}
// pairs to raise CTR. Never touches post content — only the search-result
// headline/snippet fields are in scope.

router.post('/meta-suggest/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data: post, error } = await supabase
      .from('blog_posts')
      .select('id, slug, title, meta_title, meta_description')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    if (!post) return res.status(404).json({ success: false, error: 'Post not found' });

    let topQueries = [];
    try {
      const perf = await fetchSearchPerformance();
      const page = perf?.last28?.allPages?.find(p => p.page_url === `${BLOG_URL_PREFIX}${post.slug}`);
      topQueries = page?.topQueries || [];
    } catch (perfErr) {
      console.error('[admin-blog-bulk-audit/meta-suggest] search performance fetch failed:', perfErr.message);
    }

    const prompt = `A published blog post is getting search impressions but very few clicks — a title/snippet problem, not a ranking problem. Suggest better options for the search-result title and description ONLY. Do not rewrite the article, and do not change the article's own H1 title.

Post title (H1 — for context only, do not change): ${post.title}
Current meta title (search result headline): ${post.meta_title || '(none set)'}
Current meta description (search result snippet): ${post.meta_description || '(none set)'}
${topQueries.length ? `Real Google queries bringing impressions to this page:\n${topQueries.map(q => `- "${q.query}" (${q.impressions} impressions, ${q.clicks} clicks)`).join('\n')}` : 'No per-query data available for this page.'}

Write 3 alternative options, each a {meta_title, meta_description} pair, designed to increase click-through: specific, benefit-driven, include numbers/year/urgency where it fits naturally. meta_title under 60 characters, meta_description under 155 characters. Ground them in the real queries above when given.

Return ONLY valid JSON: {"options":[{"meta_title":"...","meta_description":"..."}]}`;

    const completion = await getOpenAI().chat.completions.create({
      model:       'gpt-4o-mini',
      max_tokens:  700,
      temperature: 0.8,
      messages:    [{ role: 'user', content: prompt }],
    }, { timeout: AI_CALL_TIMEOUT_MS });

    const raw     = completion.choices[0]?.message?.content || '';
    const parsed  = parseAIJson(raw);
    const options = Array.isArray(parsed.options) ? parsed.options.slice(0, 3) : [];

    res.json({ success: true, options });
  } catch (err) {
    console.error('[admin-blog-bulk-audit/meta-suggest/:id]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /meta-confirm/:id — commits exactly one chosen option ───────────────
// UPDATE only — never INSERT, never touches slug/content/title. Only
// meta_title, meta_description, and updated_at are ever written here.

router.post('/meta-confirm/:id', requireAuth, requireAdmin, async (req, res) => {
  const { meta_title, meta_description } = req.body || {};
  if (!meta_title || !meta_description) {
    return res.status(400).json({ success: false, error: 'meta_title and meta_description are required' });
  }

  try {
    const { error } = await supabase
      .from('blog_posts')
      .update({
        meta_title,
        meta_description,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('[admin-blog-bulk-audit/meta-confirm/:id]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
