'use strict';

const supabase                          = require('../db/supabase');
const { callOpenAI, parseJSONResponse } = require('../services/ai.service');
const fetchFeaturedImage                = require('../services/unsplashImage');

// ── Helpers ───────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

// ── 1. generateBlogPost ───────────────────────────────────────

// Minimum bar a generated post must clear before it is allowed to go
// live unattended. Anything short of this is saved as 'draft' instead —
// the cron never publishes low-signal AI output without a human look.
const MIN_PUBLISH_WORD_COUNT = 800;
const MIN_PUBLISH_BLOCKS     = 4;

function meetsPublishQuality(parsed) {
  const blocks = Array.isArray(parsed.content_blocks) ? parsed.content_blocks : [];
  return (parsed.word_count || 0) >= MIN_PUBLISH_WORD_COUNT && blocks.length >= MIN_PUBLISH_BLOCKS;
}

/**
 * Generate a blog post and save it to blog_posts.
 *
 * By default the post is saved as 'draft' (existing behaviour, used by the
 * manual admin "Generate" button). Pass { autoPublish: true } to let the
 * post go live immediately (status: 'published') when it clears the
 * quality gate — used by the weekly cron so generated content actually
 * reaches blog.public.js / the live site instead of sitting unread.
 */
async function generateBlogPost(tool_id, content_type, target_keyword, { autoPublish = false } = {}) {
  try {
    const { data: tool, error: toolErr } = await supabase
      .from('tools')
      .select('*')
      .eq('id', tool_id)
      .single();
    if (toolErr) throw new Error('[MARKETING] DB save failed: ' + toolErr.message);

    const { data: seoMeta } = await supabase
      .from('seo_metadata')
      .select('*')
      .eq('slug', tool.name.toLowerCase().replace(/\s+/g, '-'))
      .maybeSingle();

    const toolSlug = tool.slug || tool.name.toLowerCase().replace(/\s+/g, '-');
    const toolUrl  = `https://www.awe-os.com/tools/${toolSlug}`;

    const prompt = `You are an expert SaaS content marketer and SEO writer for AWE-OS (awe-os.com), a free online tools website for Indian users.

Tool: ${tool.name}
Type: ${content_type}
Target Keyword: ${target_keyword}
Tool URL: ${toolUrl}
${seoMeta ? `Existing meta description: ${seoMeta.meta_description}` : ''}

SEO Rules:
- Title: Include keyword + power word
- H2s: Include keyword variations
- Word count: 1200-1800 words across all content_blocks
- Keyword density: 1-2%
- Naturally weave one inline link to the tool into a paragraph's text using: <a href='/tools/${toolSlug}'>${tool.name}</a>
- End with a callout block linking to the tool

Content type rules:
IF how_to_guide: Step-by-step with numbered H3 headings
IF listicle: Each item = H3 + 2-3 paragraphs + comparison table
IF comparison: Fair feature table + clear conclusion
IF case_study: Problem→Solution→Results + specific numbers

Return ONLY valid JSON (no markdown fences):
{
  "title": string,
  "slug": string (URL-safe, no spaces),
  "excerpt": string (2-3 sentences),
  "content_blocks": [
    { "type": "p", "text": string },
    { "type": "h2", "text": string },
    { "type": "h3", "text": string },
    { "type": "ul", "items": string[] },
    { "type": "table", "headers": string[], "rows": string[][] },
    { "type": "callout", "title": string, "text": string, "links": [{ "href": string, "label": string }] }
  ],
  "faqs": [{ "q": string, "a": string }] (5 items, 80+ words each answer),
  "meta_title": string (max 60 chars),
  "meta_description": string (max 160 chars),
  "focus_keyword": string,
  "secondary_keywords": string[],
  "tags": string[],
  "word_count": number,
  "seo_score": number (0-100),
  "readability_score": number (0-100)
}`;

    let parsed;
    try {
      const aiText = await callOpenAI(prompt, { max_tokens: 4000 });
      parsed = parseJSONResponse(aiText);
    } catch (err) {
      throw new Error('[MARKETING] AI generation failed: ' + err.message);
    }

    // Deduplicate slug
    let slug = parsed.slug;
    let slugSuffix = 2;
    while (true) {
      const { data: existing } = await supabase
        .from('blog_posts')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();
      if (!existing) break;
      slug = `${parsed.slug}-${slugSuffix++}`;
    }
    parsed.slug = slug;

    const contentBlocks = Array.isArray(parsed.content_blocks) ? parsed.content_blocks : [];
    const wordCount      = parsed.word_count || 0;
    const readTimeMin    = Math.max(1, Math.ceil(wordCount / 200));
    const canAutoPublish = autoPublish && meetsPublishQuality(parsed);
    const status         = canAutoPublish ? 'published' : 'draft';

    // Featured image is a nice-to-have — never blocks publishing.
    const featuredImage = await fetchFeaturedImage(target_keyword || tool.name).catch(() => null);

    const { data: savedPost, error: insertErr } = await supabase
      .from('blog_posts')
      .insert({
        tool_id,
        tool_name:          tool.name,
        title:              parsed.title,
        slug:               parsed.slug,
        date:               todayISO(),
        category:           tool.category || 'General',
        author:             'AWE-OS Team',
        read_time:          `${readTimeMin} min read`,
        excerpt:            parsed.excerpt,
        content:            contentBlocks,
        faqs:               parsed.faqs             || [],
        related_tools:      [{ slug: toolSlug, label: tool.name, icon: '🔧' }],
        tags:               parsed.tags              || [tool.name, content_type, 'AWE-OS'],
        meta_title:         parsed.meta_title,
        meta_description:   parsed.meta_description,
        focus_keyword:      parsed.focus_keyword,
        secondary_keywords: parsed.secondary_keywords || [],
        content_type,
        word_count:         wordCount,
        read_time_minutes:  readTimeMin,
        seo_score:          parsed.seo_score           || 0,
        readability_score:  parsed.readability_score   || 0,
        image_url:          featuredImage?.url        || null,
        image_credit:       featuredImage?.credit     || null,
        image_credit_url:   featuredImage?.creditUrl  || null,
        status,
        ...(status === 'published' ? { published_at: new Date().toISOString() } : {}),
      })
      .select()
      .single();

    if (insertErr) throw new Error('[MARKETING] DB save failed: ' + insertErr.message);

    const { error: calErr } = await supabase
      .from('content_calendar')
      .insert({
        content_type: 'blog_post',
        title:        savedPost.title,
        planned_date: todayISO(),
        priority:     'high',
        content_id:   savedPost.id,
        tool_id,
      });
    if (calErr) console.error('[MARKETING] content_calendar insert failed:', calErr.message);

    console.log(`[MARKETING] Blog ${status === 'published' ? 'published' : 'generated (draft)'}:`, savedPost.title);
    return {
      ...savedPost,
      live_url: status === 'published' ? `https://www.awe-os.com/blog/${savedPost.slug}` : null,
    };
  } catch (err) {
    console.error('[MARKETING] generateBlogPost error:', err.message);
    throw err;
  }
}

// ── 2. generateNewsletter ─────────────────────────────────────

async function generateNewsletter(segment, highlights) {
  try {
    let countQuery = supabase.from('users').select('id', { count: 'exact', head: true });

    if (segment === 'free_users') {
      countQuery = countQuery.eq('isPremium', false);
    } else if (segment === 'premium_users') {
      countQuery = countQuery.eq('isPremium', true);
    } else if (segment === 'inactive_users') {
      const { data: activeIds } = await supabase
        .from('tool_events')
        .select('user_id')
        .gt('created_at', new Date(Date.now() - 30 * 86400000).toISOString());
      const ids = [...new Set((activeIds || []).map(r => r.user_id))];
      if (ids.length) countQuery = countQuery.not('id', 'in', `(${ids.join(',')})`);
    } else if (segment === 'new_users') {
      countQuery = countQuery.gt('created_at', new Date(Date.now() - 7 * 86400000).toISOString());
    }

    const { count, error: countErr } = await countQuery;
    if (countErr) throw new Error('[MARKETING] DB save failed: ' + countErr.message);

    const recipientCount = count || 0;

    const prompt = `You are a SaaS newsletter writer.
Write an engaging, valuable newsletter.

Segment: ${segment}
Recipients: ~${recipientCount} users
Highlights: ${JSON.stringify(highlights)}

Rules:
- Subject: curiosity + benefit + emoji
- Preview text: extends subject line
- Opening: personal, conversational
- 2-3 content sections (concise)
- One clear CTA at end
- Tone: helpful friend, not salesperson

Return ONLY valid JSON:
{
  "subject_line": string,
  "preview_text": string,
  "hero_headline": string,
  "hero_body": string,
  "sections": [{
    "type": "feature"|"update"|"tip"|"case_study",
    "title": string,
    "body": string,
    "cta_text": string|null,
    "cta_url": string|null
  }],
  "predicted_open_rate": number,
  "predicted_click_rate": number
}`;

    let parsed;
    try {
      const aiText = await callOpenAI(prompt, { max_tokens: 2000 });
      parsed = parseJSONResponse(aiText);
    } catch (err) {
      throw new Error('[MARKETING] AI generation failed: ' + err.message);
    }

    const { data: saved, error: insertErr } = await supabase
      .from('newsletters')
      .insert({
        campaign_name:        `${parsed.subject_line} — ${segment}`,
        subject_line:         parsed.subject_line,
        preview_text:         parsed.preview_text,
        hero_headline:        parsed.hero_headline,
        hero_body:            parsed.hero_body,
        sections:             parsed.sections             || [],
        target_segment:       segment,
        estimated_recipients: recipientCount,
        predicted_open_rate:  parsed.predicted_open_rate  || null,
        predicted_click_rate: parsed.predicted_click_rate || null,
        status:               'draft',
      })
      .select()
      .single();

    if (insertErr) throw new Error('[MARKETING] DB save failed: ' + insertErr.message);

    console.log('[MARKETING] Newsletter:', segment, '(', recipientCount, 'recipients)');
    return saved;
  } catch (err) {
    console.error('[MARKETING] generateNewsletter error:', err.message);
    throw err;
  }
}

// ── 3. generateAdCopy ─────────────────────────────────────────

async function generateAdCopy(tool_id, platform, count = 5) {
  try {
    const { data: tool, error: toolErr } = await supabase
      .from('tools')
      .select('*')
      .eq('id', tool_id)
      .single();
    if (toolErr) throw new Error('[MARKETING] DB save failed: ' + toolErr.message);

    const { data: landingCopy } = await supabase
      .from('landing_page_copy')
      .select('*')
      .limit(1)
      .maybeSingle();

    const prompt = `You are a performance marketing expert.
Write ${count} high-converting ad copies for ${platform}.

Tool: ${tool.name}
Description: ${tool.description}
Platform: ${platform}
${landingCopy ? `Landing page headline: ${landingCopy.headline}` : ''}

Platform character limits:
Google Search: headline_1/2/3 = 30 chars, description_1/2 = 90 chars
Meta Facebook: primary_text = 125 chars, headline = 40 chars

Each ad must include:
- Clear benefit (not feature)
- Urgency or scarcity element
- Social proof reference
- Clear CTA

Return ONLY a valid JSON array:
[{
  "headline_1": string,
  "headline_2": string,
  "headline_3": string,
  "description_1": string,
  "description_2": string,
  "primary_text": string|null,
  "target_keywords": string[],
  "target_audience": string,
  "quality_score": number,
  "relevance_score": number
}]`;

    let parsed;
    try {
      const aiText = await callOpenAI(prompt, { max_tokens: 3000 });
      parsed = parseJSONResponse(aiText);
      if (!Array.isArray(parsed)) parsed = [parsed];
    } catch (err) {
      throw new Error('[MARKETING] AI generation failed: ' + err.message);
    }

    const rows = parsed.map(ad => ({
      tool_id,
      tool_name:       tool.name,
      platform,
      ad_type:         'full_ad',
      headline_1:      ad.headline_1      || null,
      headline_2:      ad.headline_2      || null,
      headline_3:      ad.headline_3      || null,
      description_1:   ad.description_1   || null,
      description_2:   ad.description_2   || null,
      primary_text:    ad.primary_text    || null,
      target_keywords: ad.target_keywords || [],
      target_audience: ad.target_audience || null,
      quality_score:   ad.quality_score   || null,
      relevance_score: ad.relevance_score || null,
      status:          'draft',
    }));

    const { data: saved, error: insertErr } = await supabase
      .from('ad_copy')
      .insert(rows)
      .select();
    if (insertErr) throw new Error('[MARKETING] DB save failed: ' + insertErr.message);

    console.log('[MARKETING] Ads created:', saved.length, 'for', platform);
    return saved;
  } catch (err) {
    console.error('[MARKETING] generateAdCopy error:', err.message);
    throw err;
  }
}

// ── 4. generateInfluencerOutreach ────────────────────────────

async function generateInfluencerOutreach(niche, platform, follower_range) {
  try {
    const profilePrompt = `Generate 5 realistic influencer profiles for:
Niche: ${niche}
Platform: ${platform}
Follower range: ${follower_range}

Return ONLY valid JSON array:
[{
  "name": string,
  "handle": string,
  "followers": number,
  "engagement_rate": number,
  "email": string
}]`;

    let profiles;
    try {
      const aiText = await callOpenAI(profilePrompt, { max_tokens: 1500 });
      profiles = parseJSONResponse(aiText);
      if (!Array.isArray(profiles)) profiles = [profiles];
    } catch (err) {
      throw new Error('[MARKETING] AI generation failed: ' + err.message);
    }

    const results = [];

    for (const influencer of profiles) {
      const pitchPrompt = `You are a brand partnerships manager for AWE-OS.
Write a personalized outreach message.

Influencer: ${influencer.name} (${influencer.handle})
Platform: ${platform}
Niche: ${niche}
Followers: ${influencer.followers}

Rules:
- Open with genuine specific compliment
- Explain why they'd like AWE-OS tools
- Clear collaboration ask
- Max 150 words, punchy not generic

Return ONLY valid JSON:
{
  "outreach_subject": string,
  "outreach_message": string
}`;

      let pitch;
      try {
        const pitchText = await callOpenAI(pitchPrompt, { max_tokens: 600 });
        pitch = parseJSONResponse(pitchText);
      } catch (err) {
        throw new Error('[MARKETING] AI generation failed: ' + err.message);
      }

      const { data: saved, error: insertErr } = await supabase
        .from('influencer_outreach')
        .insert({
          name:             influencer.name,
          handle:           influencer.handle,
          platform,
          niche,
          followers:        influencer.followers        || 0,
          engagement_rate:  influencer.engagement_rate  || 0,
          email:            influencer.email            || null,
          outreach_subject: pitch.outreach_subject,
          outreach_message: pitch.outreach_message,
          status:           'message_drafted',
        })
        .select()
        .single();

      if (insertErr) throw new Error('[MARKETING] DB save failed: ' + insertErr.message);
      results.push(saved);
    }

    return results;
  } catch (err) {
    console.error('[MARKETING] generateInfluencerOutreach error:', err.message);
    throw err;
  }
}

// ── 5. generateCompetitorComparison ──────────────────────────

async function generateCompetitorComparison(tool_id, competitor_name) {
  try {
    const { data: tool, error: toolErr } = await supabase
      .from('tools')
      .select('*')
      .eq('id', tool_id)
      .single();
    if (toolErr) throw new Error('[MARKETING] DB save failed: ' + toolErr.message);

    const prompt = `You are a SaaS product marketer.
Write an HONEST competitor comparison page. Build trust with accuracy.

Our Tool: ${tool.name}
Our URL: https://awe-os.vercel.app
Competitor: ${competitor_name}

Rules:
- BE HONEST — list real advantages on both sides
- Feature table must be fair and accurate
- Conclusion: 'Best for X use case' not 'We always win'
- Target keyword: '${tool.name} vs ${competitor_name}'

Return ONLY valid JSON:
{
  "page_title": string,
  "slug": string,
  "meta_title": string,
  "meta_description": string,
  "target_keyword": string,
  "comparison_table": [{
    "feature": string,
    "ours": string,
    "theirs": string,
    "winner": "us"|"them"|"tie"
  }],
  "our_advantages": string[],
  "their_advantages": string[],
  "conclusion_text": string,
  "cta_text": string
}`;

    let parsed;
    try {
      const aiText = await callOpenAI(prompt, { max_tokens: 2500 });
      parsed = parseJSONResponse(aiText);
    } catch (err) {
      throw new Error('[MARKETING] AI generation failed: ' + err.message);
    }

    const { data: saved, error: insertErr } = await supabase
      .from('competitor_comparisons')
      .insert({
        tool_id,
        our_tool_name:    tool.name,
        competitor_name,
        competitor_url:   null,
        page_title:       parsed.page_title,
        slug:             parsed.slug,
        meta_title:       parsed.meta_title,
        meta_description: parsed.meta_description,
        target_keyword:   parsed.target_keyword,
        comparison_table: parsed.comparison_table  || [],
        our_advantages:   parsed.our_advantages    || [],
        their_advantages: parsed.their_advantages  || [],
        conclusion_text:  parsed.conclusion_text,
        cta_text:         parsed.cta_text,
        status:           'draft',
      })
      .select()
      .single();

    if (insertErr) throw new Error('[MARKETING] DB save failed: ' + insertErr.message);

    return saved;
  } catch (err) {
    console.error('[MARKETING] generateCompetitorComparison error:', err.message);
    throw err;
  }
}

// ── 6. generateCampaignBrief ──────────────────────────────────

async function generateCampaignBrief(tool_id, campaign_type, goal_type, goal_target, duration_days) {
  try {
    const { data: tool, error: toolErr } = await supabase
      .from('tools')
      .select('*')
      .eq('id', tool_id)
      .single();
    if (toolErr) throw new Error('[MARKETING] DB save failed: ' + toolErr.message);

    const prompt = `You are a SaaS CMO. Create a complete marketing campaign brief.

Tool: ${tool.name}
Campaign type: ${campaign_type}
Goal: ${goal_target} ${goal_type}
Duration: ${duration_days} days

Return ONLY valid JSON:
{
  "campaign_name": string,
  "executive_summary": string,
  "target_audience": {
    "primary": string,
    "secondary": string,
    "psychographics": string
  },
  "key_messages": string[],
  "channels": [{
    "channel": string,
    "budget_pct": number,
    "expected_reach": number,
    "content_pieces": number
  }],
  "content_calendar": [{
    "week": number,
    "theme": string,
    "activities": string[]
  }],
  "kpis": [{
    "metric": string,
    "target": number,
    "measurement": string
  }],
  "budget_breakdown": object,
  "risks": string[],
  "mitigation": string[],
  "success_criteria": string
}`;

    let parsed;
    try {
      const aiText = await callOpenAI(prompt, { max_tokens: 3000 });
      parsed = parseJSONResponse(aiText);
    } catch (err) {
      throw new Error('[MARKETING] AI generation failed: ' + err.message);
    }

    const { data: saved, error: insertErr } = await supabase
      .from('marketing_campaigns')
      .insert({
        campaign_name:   parsed.campaign_name,
        campaign_type,
        tool_id,
        goal_type,
        goal_target,
        start_date:      todayISO(),
        end_date:        new Date(Date.now() + duration_days * 86400000).toISOString().slice(0, 10),
        campaign_brief:  JSON.stringify(parsed),
        status:          'planning',
      })
      .select()
      .single();

    if (insertErr) throw new Error('[MARKETING] DB save failed: ' + insertErr.message);

    console.log('[MARKETING] Campaign brief:', parsed.campaign_name);
    return saved;
  } catch (err) {
    console.error('[MARKETING] generateCampaignBrief error:', err.message);
    throw err;
  }
}

// ── 7. createReferralProgram ──────────────────────────────────

async function createReferralProgram(user_email, reward_type) {
  try {
    const { data: existing, error: checkErr } = await supabase
      .from('referral_program')
      .select('*')
      .eq('referrer_email', user_email)
      .eq('status', 'active')
      .maybeSingle();

    if (checkErr) throw new Error('[MARKETING] DB save failed: ' + checkErr.message);

    if (existing) {
      return {
        referral_code:    existing.referral_code,
        referral_url:     `https://awe-os.vercel.app?ref=${existing.referral_code}`,
        referrer_reward:  existing.referrer_reward,
        referee_reward:   existing.referee_reward,
        expires_at:       existing.expires_at,
      };
    }

    const referrer_reward = reward_type === 'free_month' ? '1 month free' : '20% commission';

    const { data: saved, error: insertErr } = await supabase
      .from('referral_program')
      .insert({
        referrer_email:  user_email,
        reward_type,
        referrer_reward,
        referee_reward:  '20% off first month',
        expires_at:      addDays(90),
        status:          'active',
      })
      .select()
      .single();

    if (insertErr) throw new Error('[MARKETING] DB save failed: ' + insertErr.message);

    return {
      referral_code:   saved.referral_code,
      referral_url:    `https://awe-os.vercel.app?ref=${saved.referral_code}`,
      referrer_reward: saved.referrer_reward,
      referee_reward:  saved.referee_reward,
      expires_at:      saved.expires_at,
    };
  } catch (err) {
    console.error('[MARKETING] createReferralProgram error:', err.message);
    throw err;
  }
}

// ── 8. getMarketingDashboard ──────────────────────────────────

async function getMarketingDashboard() {
  try {
    const monthStart = startOfMonth();
    const today      = todayISO();
    const weekAhead  = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

    const [
      blogDrafts,
      blogApproved,
      blogPublished,
      blogSeoAvg,
      nlDrafts,
      nlScheduled,
      nlSent,
      nlOpenAvg,
      refPrograms,
      refClicks,
      refConversions,
      refEarned,
      adActive,
      adPlatforms,
      adImpressions,
      adCtr,
      infIdentified,
      infContacted,
      infActive,
      campActive,
      campRoi,
      calWeek,
      calOverdue,
    ] = await Promise.all([
      // blog stats
      supabase.from('blog_posts').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
      supabase.from('blog_posts').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('blog_posts').select('id', { count: 'exact', head: true }).eq('status', 'published').gte('published_at', monthStart),
      supabase.from('blog_posts').select('seo_score'),

      // newsletter stats
      supabase.from('newsletters').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
      supabase.from('newsletters').select('id', { count: 'exact', head: true }).eq('status', 'scheduled'),
      supabase.from('newsletters').select('id', { count: 'exact', head: true }).eq('status', 'sent').gte('sent_at', monthStart),
      supabase.from('newsletters').select('actual_open_rate'),

      // referral stats
      supabase.from('referral_program').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('referral_program').select('clicks'),
      supabase.from('referral_program').select('conversions'),
      supabase.from('referral_program').select('total_earned'),

      // ad stats
      supabase.from('ad_copy').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('ad_copy').select('platform').eq('status', 'active'),
      supabase.from('ad_copy').select('impressions'),
      supabase.from('ad_copy').select('ctr'),

      // influencer stats
      supabase.from('influencer_outreach').select('id', { count: 'exact', head: true }).eq('status', 'identified'),
      supabase.from('influencer_outreach').select('id', { count: 'exact', head: true }).eq('status', 'contacted'),
      supabase.from('influencer_outreach').select('id', { count: 'exact', head: true }).eq('status', 'active'),

      // campaign stats
      supabase.from('marketing_campaigns').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('marketing_campaigns').select('roi'),

      // content calendar
      supabase.from('content_calendar').select('*').gte('planned_date', today).lte('planned_date', weekAhead).order('planned_date').limit(5),
      supabase.from('content_calendar').select('id', { count: 'exact', head: true }).lt('planned_date', today).not('status', 'in', '("published","cancelled")'),
    ]);

    const avg = (rows, key) => {
      const vals = (rows || []).map(r => Number(r[key])).filter(v => !isNaN(v) && v > 0);
      return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : 0;
    };
    const sum = (rows, key) => (rows || []).reduce((a, r) => a + (Number(r[key]) || 0), 0);
    const distinct = (rows, key) => [...new Set((rows || []).map(r => r[key]).filter(Boolean))];

    return {
      blog: {
        drafts:               blogDrafts.count       || 0,
        approved:             blogApproved.count     || 0,
        published_this_month: blogPublished.count    || 0,
        avg_seo_score:        avg(blogSeoAvg.data, 'seo_score'),
      },
      newsletter: {
        drafts:           nlDrafts.count     || 0,
        scheduled:        nlScheduled.count  || 0,
        sent_this_month:  nlSent.count       || 0,
        avg_open_rate:    avg(nlOpenAvg.data, 'actual_open_rate'),
      },
      referral: {
        active_programs:    refPrograms.count || 0,
        total_clicks:       sum(refClicks.data, 'clicks'),
        total_conversions:  sum(refConversions.data, 'conversions'),
        revenue_attributed: sum(refEarned.data, 'total_earned'),
      },
      ads: {
        active_copies:    adActive.count || 0,
        platforms:        distinct(adPlatforms.data, 'platform'),
        total_impressions: sum(adImpressions.data, 'impressions'),
        avg_ctr:          avg(adCtr.data, 'ctr'),
      },
      influencers: {
        identified: infIdentified.count || 0,
        contacted:  infContacted.count  || 0,
        active:     infActive.count     || 0,
      },
      campaigns: {
        active:    campActive.count || 0,
        total_roi: avg(campRoi.data, 'roi'),
      },
      content_calendar: {
        this_week: calWeek.data   || [],
        overdue:   calOverdue.count || 0,
      },
    };
  } catch (err) {
    console.error('[MARKETING] getMarketingDashboard error:', err.message);
    throw err;
  }
}

// ── Exports ───────────────────────────────────────────────────

module.exports = {
  generateBlogPost,
  generateNewsletter,
  generateAdCopy,
  generateInfluencerOutreach,
  generateCompetitorComparison,
  generateCampaignBrief,
  createReferralProgram,
  getMarketingDashboard,
};
