'use strict';
const { getOpenAI } = require('../ai-engine');
const parseAIJson   = require('../../services/parseAIJson');

/**
 * Social Media Content Scheduler
 * Generate + schedule Reddit/Quora/Pinterest posts
 * Stores schedules in Supabase scheduled_posts table
 */

async function generateScheduledPosts(opts = {}) {
  const {
    platform   = 'reddit',
    toolSlug   = '',
    toolName   = '',
    blogPost   = null,
    count      = 5,
    subreddits = []
  } = opts;

  const openai = getOpenAI();

  const platformGuide = {
    reddit: {
      style:  'conversational, adds value, not promotional',
      format: 'title + text post or link post',
      rules:  'no spam, must add value, follow subreddit rules'
    },
    quora: {
      style:  'expert answer, detailed, helpful',
      format: 'question + detailed answer',
      rules:  'answer real questions, mention tool naturally'
    },
    pinterest: {
      style:  'visual description, keyword-rich, actionable',
      format: 'pin title + description',
      rules:  'include keywords, use action words'
    }
  };

  const guide = platformGuide[platform] || platformGuide.reddit;

  const prompt = `
Generate ${count} ${platform} posts to promote:
${toolName ? `Tool: ${toolName} (${toolSlug})` : ''}
${blogPost ? `Blog Post: "${blogPost.title}" - ${blogPost.excerpt}` : ''}

Platform: ${platform}
Style: ${guide.style}
Format: ${guide.format}
Rules: ${guide.rules}
${subreddits.length ? `Target subreddits: ${subreddits.join(', ')}` : ''}

Context: AWE-OS (awe-os.com) — free online tools for Indians
Target audience: Indian professionals, students, small business owners

For each post return:
{
  "platform": "${platform}",
  "title": "post title",
  "content": "post body/answer (200-400 words)",
  "targetCommunity": "subreddit OR quora topic OR pinterest board",
  "bestTimeToPost": "morning|afternoon|evening",
  "bestDay": "Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday",
  "estimatedEngagement": "high|medium|low",
  "hashtags": ["tag1", "tag2"],
  "callToAction": "subtle CTA",
  "toolUrl": "https://www.awe-os.com/tools/${toolSlug}"
}

Return JSON array of ${count} posts.
Return ONLY JSON array.`.trim();

  const res = await openai.chat.completions.create({
    model:       'gpt-4o',
    max_tokens:  3000,
    temperature: 0.7,
    messages: [
      { role: 'system', content: 'You are a social media expert. Return only valid JSON array.' },
      { role: 'user',   content: prompt }
    ]
  });

  const posts = parseAIJson(res.choices[0].message.content) || [];
  return Array.isArray(posts) ? posts : [posts];
}

async function schedulePosts(posts, scheduledFor = null) {
  const supabase = require('../../db/supabase');
  const results  = [];

  for (const post of posts) {
    const scheduledAt = scheduledFor ||
      getNextBestTime(post.bestDay, post.bestTimeToPost);

    const { data, error } = await supabase
      .from('scheduled_posts')
      .insert({
        platform:         post.platform,
        title:            post.title,
        content:          post.content,
        target_community: post.targetCommunity,
        hashtags:         post.hashtags,
        call_to_action:   post.callToAction,
        tool_url:         post.toolUrl,
        status:           'scheduled',
        scheduled_at:     scheduledAt,
        created_at:       new Date().toISOString()
      })
      .select()
      .single();

    results.push(error
      ? { error: error.message, post }
      : { success: true, id: data.id, scheduledAt }
    );
  }

  return results;
}

async function getScheduledPosts(opts = {}) {
  const { platform = null, status = null, limit = 20 } = opts;
  const supabase = require('../../db/supabase');

  let query = supabase
    .from('scheduled_posts')
    .select('*')
    .order('scheduled_at', { ascending: true })
    .limit(limit);

  if (platform) query = query.eq('platform', platform);
  if (status)   query = query.eq('status', status);

  const { data } = await query;
  return data || [];
}

async function updatePostStatus(postId, status) {
  const supabase = require('../../db/supabase');
  const { data } = await supabase
    .from('scheduled_posts')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', postId)
    .select()
    .single();
  return data;
}

function getNextBestTime(day, timeOfDay) {
  const now  = new Date();
  const hour = timeOfDay === 'morning'   ? 9
             : timeOfDay === 'afternoon' ? 14
             : 20;

  const days       = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const targetDay  = days.indexOf(day);
  const currentDay = now.getDay();

  let daysUntil = targetDay - currentDay;
  if (daysUntil <= 0) daysUntil += 7;
  if (daysUntil === 0 && now.getHours() >= hour) daysUntil = 7;

  const scheduled = new Date(now);
  scheduled.setDate(scheduled.getDate() + daysUntil);
  scheduled.setHours(hour, 0, 0, 0);
  return scheduled.toISOString();
}

module.exports = {
  generateScheduledPosts,
  schedulePosts,
  getScheduledPosts,
  updatePostStatus
};
