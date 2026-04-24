'use strict';

const supabase = require('../db/supabase');
const {
  generateBlogPost,
  generateNewsletter    : agentGenerateNewsletter,
  generateAdCopy        : agentGenerateAdCopy,
  generateInfluencerOutreach,
  generateCompetitorComparison,
  generateCampaignBrief,
  createReferralProgram,
  getMarketingDashboard,
} = require('../agents/marketing-agent');

// ── Stub (will move to agent once finalized) ──────────────────

async function generateContentCalendar(tool_id, month, year) {
  const { callOpenAI, parseJSONResponse } = require('../services/ai.service');

  const { data: tool, error: toolErr } = await supabase
    .from('tools')
    .select('*')
    .eq('id', tool_id)
    .single();
  if (toolErr) throw new Error('Tool not found: ' + toolErr.message);

  const prompt = `You are a content strategist.
Create a 30-day content calendar for month ${month}/${year}.
Tool: ${tool.name}
Create a balanced mix:
- 4 blog posts (weekly)
- 4 newsletters (weekly)
- 12 social posts (3x/week)
- 2 ad campaigns
- 1 influencer outreach batch
Return ONLY valid JSON array:
[{
  "week": number,
  "day": number (1-30),
  "content_type": "blog_post"|"newsletter"|"social_post"|"ad_campaign"|"influencer",
  "title": string,
  "platform": string,
  "priority": "must_publish"|"high"|"medium"|"low",
  "notes": string
}]`;

  const raw   = await callOpenAI(prompt, { max_tokens: 3000 });
  const items = parseJSONResponse(raw);

  const monthStr      = String(month).padStart(2, '0');
  const calendarItems = items.map(item => ({
    content_type: item.content_type,
    title:        item.title,
    planned_date: `${year}-${monthStr}-${String(item.day).padStart(2, '0')}`,
    platform:     item.platform  || null,
    priority:     item.priority  || 'medium',
    notes:        item.notes     || null,
    tool_id,
    status:       'planned',
  }));

  const { data: saved, error: insertErr } = await supabase
    .from('content_calendar')
    .insert(calendarItems)
    .select();
  if (insertErr) throw new Error('Calendar insert failed: ' + insertErr.message);

  console.log('[MARKETING] Calendar generated:', saved.length, 'items');
  return saved;
}

// ── Constants ─────────────────────────────────────────────────

const BLOG_STATUSES     = ['draft', 'review', 'approved', 'published', 'archived'];
const BLOG_TYPES        = ['how_to_guide', 'listicle', 'case_study', 'comparison',
                           'thought_leadership', 'product_update', 'press_release', 'tutorial'];
const SEGMENTS          = ['all_users', 'free_users', 'premium_users', 'inactive_users', 'new_users'];
const AD_PLATFORMS      = ['google_search', 'google_display', 'meta_facebook',
                           'meta_instagram', 'twitter', 'linkedin'];
const CAMPAIGN_TYPES    = ['product_launch', 'seasonal', 'referral_drive', 'content_series',
                           'paid_acquisition', 'reactivation', 'brand_awareness'];
const CAMPAIGN_STATUSES = ['planning', 'active', 'paused', 'completed', 'cancelled'];

// ── Dashboard ─────────────────────────────────────────────────

async function getDashboard(req, res) {
  try {
    const result = await getMarketingDashboard();
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('[MARKETING CTRL] getDashboard error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

// ── Blog ──────────────────────────────────────────────────────

async function generateBlog(req, res) {
  try {
    const { tool_id, content_type, target_keyword } = req.body;

    if (!tool_id) {
      return res.status(400).json({ error: 'tool_id is required' });
    }
    if (!content_type || !BLOG_TYPES.includes(content_type)) {
      return res.status(400).json({
        error: `content_type must be one of: ${BLOG_TYPES.join(', ')}`,
      });
    }

    const { data: tool, error: toolErr } = await supabase
      .from('tools')
      .select('name')
      .eq('id', tool_id)
      .single();
    if (toolErr) return res.status(404).json({ error: 'Tool not found' });

    const keyword = target_keyword || tool.name;
    const post    = await generateBlogPost(tool_id, content_type, keyword);

    return res.json({ success: true, data: post });
  } catch (err) {
    console.error('[MARKETING CTRL] generateBlog error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

async function getBlogs(req, res) {
  try {
    const { status, tool_id, content_type } = req.query;

    let query = supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (status)       query = query.eq('status', status);
    if (tool_id)      query = query.eq('tool_id', tool_id);
    if (content_type) query = query.eq('content_type', content_type);

    const { data: posts, error } = await query;
    if (error) throw error;

    return res.json({ success: true, data: posts, count: posts.length });
  } catch (err) {
    console.error('[MARKETING CTRL] getBlogs error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

async function updateBlogStatus(req, res) {
  try {
    const { id }     = req.params;
    const { status } = req.body;

    if (!status || !BLOG_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `status must be one of: ${BLOG_STATUSES.join(', ')}`,
      });
    }

    const updates = { status };
    if (status === 'published') updates.published_at = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from('blog_posts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[MARKETING CTRL] updateBlogStatus error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

// ── Newsletter ────────────────────────────────────────────────

async function generateNewsletter(req, res) {
  try {
    const { segment, highlights } = req.body;

    if (!segment || !SEGMENTS.includes(segment)) {
      return res.status(400).json({
        error: `segment must be one of: ${SEGMENTS.join(', ')}`,
      });
    }

    const newsletter = await agentGenerateNewsletter(segment, highlights || {});
    return res.json({ success: true, data: newsletter });
  } catch (err) {
    console.error('[MARKETING CTRL] generateNewsletter error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

async function getNewsletters(req, res) {
  try {
    const { data: newsletters, error } = await supabase
      .from('newsletters')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return res.json({ success: true, data: newsletters });
  } catch (err) {
    console.error('[MARKETING CTRL] getNewsletters error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

// ── Ad Copy ───────────────────────────────────────────────────

async function generateAdCopy(req, res) {
  try {
    const { tool_id, platform } = req.body;
    const count = Math.min(parseInt(req.body.count, 10) || 5, 10);

    if (!tool_id) {
      return res.status(400).json({ error: 'tool_id is required' });
    }
    if (!platform || !AD_PLATFORMS.includes(platform)) {
      return res.status(400).json({
        error: `platform must be one of: ${AD_PLATFORMS.join(', ')}`,
      });
    }

    const ads = await agentGenerateAdCopy(tool_id, platform, count);
    return res.json({ success: true, data: ads, count: ads.length });
  } catch (err) {
    console.error('[MARKETING CTRL] generateAdCopy error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

async function getAdCopy(req, res) {
  try {
    const { platform, status, tool_id } = req.query;

    let query = supabase
      .from('ad_copy')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (platform) query = query.eq('platform', platform);
    if (status)   query = query.eq('status', status);
    if (tool_id)  query = query.eq('tool_id', tool_id);

    const { data: ads, error } = await query;
    if (error) throw error;

    return res.json({ success: true, data: ads });
  } catch (err) {
    console.error('[MARKETING CTRL] getAdCopy error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

// ── Referrals ─────────────────────────────────────────────────

async function createReferral(req, res) {
  try {
    const { user_email, reward_type } = req.body;

    if (!user_email) {
      return res.status(400).json({ error: 'user_email is required' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user_email)) {
      return res.status(400).json({ error: 'user_email is not a valid email address' });
    }

    const result = await createReferralProgram(user_email, reward_type || 'discount');
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('[MARKETING CTRL] createReferral error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

async function getReferrals(req, res) {
  try {
    const { data: referrals, error: refErr } = await supabase
      .from('referral_program')
      .select('*')
      .order('created_at', { ascending: false });

    if (refErr) throw refErr;

    const ids = referrals.map(r => r.id);
    let conversionCounts = {};

    if (ids.length > 0) {
      const { data: convRows, error: convErr } = await supabase
        .from('referral_conversions')
        .select('referral_id, status')
        .in('referral_id', ids);

      if (!convErr && convRows) {
        for (const row of convRows) {
          if (!conversionCounts[row.referral_id]) {
            conversionCounts[row.referral_id] = { total: 0, converted: 0 };
          }
          conversionCounts[row.referral_id].total += 1;
          if (row.status === 'converted') {
            conversionCounts[row.referral_id].converted += 1;
          }
        }
      }
    }

    const data = referrals.map(r => ({
      ...r,
      conversion_counts: conversionCounts[r.id] || { total: 0, converted: 0 },
    }));

    return res.json({ success: true, data });
  } catch (err) {
    console.error('[MARKETING CTRL] getReferrals error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

async function trackReferralClick(req, res) {
  try {
    const { code } = req.params;

    const { data: referral, error: findErr } = await supabase
      .from('referral_program')
      .select('*')
      .eq('referral_code', code)
      .eq('status', 'active')
      .single();

    if (findErr || !referral) {
      return res.status(404).json({ error: 'Invalid referral code' });
    }

    await supabase
      .from('referral_program')
      .update({ clicks: referral.clicks + 1 })
      .eq('id', referral.id);

    await supabase
      .from('referral_conversions')
      .insert({
        referral_id:    referral.id,
        referral_code:  code,
        referee_email:  'anonymous',
        status:         'clicked',
      });

    return res.json({ success: true, referral_url: 'https://awe-os.vercel.app' });
  } catch (err) {
    console.error('[MARKETING CTRL] trackReferralClick error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

// ── Influencers ───────────────────────────────────────────────

async function generateInfluencers(req, res) {
  try {
    const { niche, platform, follower_range } = req.body;

    if (!niche)    return res.status(400).json({ error: 'niche is required' });
    if (!platform) return res.status(400).json({ error: 'platform is required' });

    const influencers = await generateInfluencerOutreach(
      niche,
      platform,
      follower_range || '10K-100K',
    );

    return res.json({ success: true, data: influencers, count: influencers.length });
  } catch (err) {
    console.error('[MARKETING CTRL] generateInfluencers error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

async function getInfluencers(req, res) {
  try {
    const { status, platform } = req.query;

    let query = supabase
      .from('influencer_outreach')
      .select('*')
      .order('created_at', { ascending: false });

    if (status)   query = query.eq('status', status);
    if (platform) query = query.eq('platform', platform);

    const { data: influencers, error } = await query;
    if (error) throw error;

    return res.json({ success: true, data: influencers });
  } catch (err) {
    console.error('[MARKETING CTRL] getInfluencers error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

// ── Competitor Comparisons ────────────────────────────────────

async function generateComparison(req, res) {
  try {
    const { tool_id, competitor_name } = req.body;

    if (!tool_id)         return res.status(400).json({ error: 'tool_id is required' });
    if (!competitor_name) return res.status(400).json({ error: 'competitor_name is required' });

    const comparison = await generateCompetitorComparison(tool_id, competitor_name);
    return res.json({ success: true, data: comparison });
  } catch (err) {
    console.error('[MARKETING CTRL] generateComparison error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

async function getComparisons(req, res) {
  try {
    const { data: comparisons, error } = await supabase
      .from('competitor_comparisons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.json({ success: true, data: comparisons });
  } catch (err) {
    console.error('[MARKETING CTRL] getComparisons error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

// ── Campaigns ─────────────────────────────────────────────────

async function generateCampaign(req, res) {
  try {
    const { tool_id, campaign_type, goal_type } = req.body;
    const goal_target    = parseFloat(req.body.goal_target)    || 100;
    const duration_days  = parseInt(req.body.duration_days, 10) || 30;

    if (!tool_id)       return res.status(400).json({ error: 'tool_id is required' });
    if (!campaign_type || !CAMPAIGN_TYPES.includes(campaign_type)) {
      return res.status(400).json({
        error: `campaign_type must be one of: ${CAMPAIGN_TYPES.join(', ')}`,
      });
    }
    if (!goal_type) return res.status(400).json({ error: 'goal_type is required' });

    const campaign = await generateCampaignBrief(
      tool_id, campaign_type, goal_type, goal_target, duration_days,
    );
    return res.json({ success: true, data: campaign });
  } catch (err) {
    console.error('[MARKETING CTRL] generateCampaign error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

async function getCampaigns(req, res) {
  try {
    const { status } = req.query;

    let query = supabase
      .from('marketing_campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (status && CAMPAIGN_STATUSES.includes(status)) {
      query = query.eq('status', status);
    }

    const { data: campaigns, error } = await query;
    if (error) throw error;

    return res.json({ success: true, data: campaigns });
  } catch (err) {
    console.error('[MARKETING CTRL] getCampaigns error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

// ── Content Calendar ──────────────────────────────────────────

async function getCalendar(req, res) {
  try {
    const month   = parseInt(req.query.month, 10)  || new Date().getMonth() + 1;
    const year    = parseInt(req.query.year,  10)  || new Date().getFullYear();
    const tool_id = req.query.tool_id || null;

    const startDate = new Date(year, month - 1, 1).toISOString().slice(0, 10);
    const endDate   = new Date(year, month, 0).toISOString().slice(0, 10);

    let query = supabase
      .from('content_calendar')
      .select('*')
      .gte('planned_date', startDate)
      .lte('planned_date', endDate)
      .order('planned_date', { ascending: true });

    if (tool_id) query = query.eq('tool_id', tool_id);

    const { data: items, error } = await query;
    if (error) throw error;

    return res.json({ success: true, data: items });
  } catch (err) {
    console.error('[MARKETING CTRL] getCalendar error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

async function generateCalendar(req, res) {
  try {
    const { tool_id } = req.body;
    const month = parseInt(req.body.month, 10);
    const year  = parseInt(req.body.year,  10);

    if (!tool_id)               return res.status(400).json({ error: 'tool_id is required' });
    if (!month || month < 1 || month > 12) {
      return res.status(400).json({ error: 'month must be a number between 1 and 12' });
    }
    if (!year) return res.status(400).json({ error: 'year is required' });

    const calendar = await generateContentCalendar(tool_id, month, year);
    return res.json({ success: true, data: calendar, count: calendar.length });
  } catch (err) {
    console.error('[MARKETING CTRL] generateCalendar error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

// ── Exports ───────────────────────────────────────────────────

module.exports = {
  getDashboard,
  generateBlog,
  getBlogs,
  updateBlogStatus,
  generateNewsletter,
  getNewsletters,
  generateAdCopy,
  getAdCopy,
  createReferral,
  getReferrals,
  trackReferralClick,
  generateInfluencers,
  getInfluencers,
  generateComparison,
  getComparisons,
  generateCampaign,
  getCampaigns,
  getCalendar,
  generateCalendar,
};
