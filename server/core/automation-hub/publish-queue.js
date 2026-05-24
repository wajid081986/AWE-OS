'use strict';

/**
 * Content Publishing Queue
 * Manages ordered publishing of pages/posts.
 * Hard rate limit: max 10 publishes per hour (GitHub API safety).
 */

const MAX_PER_HOUR = 10;

async function addToQueue(item) {
  const supabase = require('../../db/supabase');
  const { data } = await supabase
    .from('publish_queue')
    .insert({
      type:       item.type,
      title:      item.title,
      slug:       item.slug,
      page_data:  item.pageData,
      priority:   item.priority || 5,
      status:     'queued',
      created_at: new Date().toISOString()
    })
    .select()
    .single();
  return data;
}

async function getQueue(status = null) {
  const supabase = require('../../db/supabase');
  let query = supabase
    .from('publish_queue')
    .select('*')
    .order('priority',   { ascending: false })
    .order('created_at', { ascending: true });

  if (status) query = query.eq('status', status);
  const { data } = await query;
  return data || [];
}

async function processQueue(publishFns = {}) {
  const supabase = require('../../db/supabase');

  // Check hourly rate limit
  const hourAgo    = new Date(Date.now() - 3_600_000).toISOString();
  const { count }  = await supabase
    .from('publish_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'published')
    .gte('published_at', hourAgo);

  const remaining = MAX_PER_HOUR - (count || 0);
  if (remaining <= 0) {
    return { processed: 0, message: `Rate limit: ${MAX_PER_HOUR}/hour. Try again later.` };
  }

  const { data: items } = await supabase
    .from('publish_queue')
    .select('*')
    .eq('status', 'queued')
    .order('priority', { ascending: false })
    .limit(remaining);

  const results = [];

  for (const item of (items || [])) {
    try {
      await supabase
        .from('publish_queue')
        .update({ status: 'processing' })
        .eq('id', item.id);

      const publishFn = publishFns[item.type];
      if (!publishFn) throw new Error(`No publisher for type: ${item.type}`);

      const result = await publishFn(item.page_data, item.slug);

      await supabase
        .from('publish_queue')
        .update({
          status:       'published',
          published_at: new Date().toISOString(),
          live_url:     result.liveUrl
        })
        .eq('id', item.id);

      results.push({ success: true, id: item.id, title: item.title, url: result.liveUrl });
    } catch (err) {
      await supabase
        .from('publish_queue')
        .update({ status: 'failed', error_message: err.message })
        .eq('id', item.id);

      results.push({ success: false, id: item.id, error: err.message });
    }

    await new Promise(r => setTimeout(r, 2000));
  }

  return {
    processed: results.length,
    succeeded: results.filter(r => r.success).length,
    failed:    results.filter(r => !r.success).length,
    results
  };
}

async function clearQueue(status = 'published') {
  const supabase  = require('../../db/supabase');
  const { count } = await supabase
    .from('publish_queue')
    .delete()
    .eq('status', status);
  return { deleted: count };
}

async function getQueueStats() {
  const supabase = require('../../db/supabase');
  const statuses = ['queued', 'processing', 'published', 'failed'];
  const stats    = {};

  for (const s of statuses) {
    const { count } = await supabase
      .from('publish_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', s);
    stats[s] = count || 0;
  }

  // Also return hourly rate-limit info
  const hourAgo       = new Date(Date.now() - 3_600_000).toISOString();
  const { count: hc } = await supabase
    .from('publish_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'published')
    .gte('published_at', hourAgo);

  stats.publishedThisHour = hc || 0;
  stats.remainingThisHour = Math.max(0, MAX_PER_HOUR - (hc || 0));
  stats.maxPerHour        = MAX_PER_HOUR;

  return stats;
}

module.exports = { addToQueue, getQueue, processQueue, clearQueue, getQueueStats };
