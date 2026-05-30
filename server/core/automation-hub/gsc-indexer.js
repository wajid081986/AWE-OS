'use strict';

/**
 * Google Search Console Indexing Helper
 * Logs URLs that need indexing and provides a direct GSC inspection link.
 * Manual step required: open the inspection link and click "Request Indexing".
 */

function gscInspectLink(url) {
  return `https://search.google.com/search-console/inspect?resource_id=${encodeURIComponent(process.env.GOOGLE_SITE_URL || '')}&id=${encodeURIComponent(url)}`;
}

async function requestIndexing(url, type = 'URL_UPDATED') {
  await logIndexingRequest(url, type, 'manual_required');

  return {
    success:     true,
    url,
    status:      'manual_required',
    message:     'URL logged. Open the inspection link in Search Console and click "Request Indexing".',
    inspectLink: gscInspectLink(url)
  };
}

async function batchRequestIndexing(urls, type = 'URL_UPDATED') {
  const results = [];

  for (const url of urls) {
    results.push(await requestIndexing(url, type));
  }

  return {
    submitted:   0,
    failed:      0,
    skipped:     0,
    quotaUsed:   0,
    quotaLimit:  200,
    results,
    skippedUrls: []
  };
}

async function getUrlStatus(url) {
  return {
    configured:  true,
    url,
    status:      'manual_required',
    inspectLink: gscInspectLink(url)
  };
}

async function logIndexingRequest(url, type, status, error = null) {
  try {
    const supabase = require('../../db/supabase');
    await supabase.from('gsc_index_log').insert({
      url,
      type,
      status,
      error_message: error,
      submitted_at:  new Date().toISOString()
    });
  } catch {}
}

async function getDailyQuotaUsed() {
  try {
    const supabase = require('../../db/supabase');
    const today    = new Date().toISOString().split('T')[0];
    const { count } = await supabase
      .from('gsc_index_log')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'submitted')
      .gte('submitted_at', `${today}T00:00:00`);
    return count || 0;
  } catch {
    return 0;
  }
}

async function getIndexingHistory(limit = 50) {
  try {
    const supabase = require('../../db/supabase');
    const { data } = await supabase
      .from('gsc_index_log')
      .select('*')
      .order('submitted_at', { ascending: false })
      .limit(limit);
    return data || [];
  } catch {
    return [];
  }
}

module.exports = {
  requestIndexing,
  batchRequestIndexing,
  getUrlStatus,
  getIndexingHistory,
  getDailyQuotaUsed
};
