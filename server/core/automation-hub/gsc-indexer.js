'use strict';

const INSPECT_BASE = 'https://search.google.com/search-console/inspect?resource_id=https%3A%2F%2Fwww.awe-os.com%2F&id=';

function manualUrl(url) {
  return INSPECT_BASE + encodeURIComponent(url);
}

async function requestIndexing(url, type = 'URL_UPDATED') {
  await logIndexingRequest(url, type, 'pending');
  return {
    success:   true,
    url,
    status:    'pending',
    manualUrl: manualUrl(url)
  };
}

async function batchRequestIndexing(urls, type = 'URL_UPDATED') {
  const results = [];
  for (const url of urls) {
    results.push(await requestIndexing(url, type));
  }
  return {
    submitted:   results.length,
    failed:      0,
    skipped:     0,
    results,
    skippedUrls: []
  };
}

async function getUrlStatus(url) {
  return {
    configured: true,
    url,
    status:     'pending',
    manualUrl:  manualUrl(url)
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
      .eq('status', 'pending')
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
