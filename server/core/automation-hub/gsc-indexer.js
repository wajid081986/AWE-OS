'use strict';

/**
 * Google Search Console Auto-Indexing
 * Uses Google Indexing API to request URL indexing
 *
 * Requires env vars:
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL
 *   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
 *
 * If env vars missing → graceful degradation (log warning, skip)
 */

function getGoogleAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key   = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!email || !key) return null;

  try {
    const { google } = require('googleapis');
    return new google.auth.JWT({
      email,
      key:    key.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/webmasters']
    });
  } catch {
    return null;
  }
}

async function requestIndexing(url, type = 'URL_UPDATED') {
  const auth = getGoogleAuth();

  if (!auth) {
    return {
      success: false,
      url,
      status:  'skipped',
      message: 'Google service account not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.'
    };
  }

  try {
    const { google }   = require('googleapis');
    const searchconsole = google.searchconsole({ version: 'v1', auth });

    await searchconsole.urlInspection.index.inspect({
      requestBody: {
        inspectionUrl: url,
        siteUrl:       process.env.GOOGLE_SITE_URL
      }
    });

    await logIndexingRequest(url, type, 'submitted');

    return {
      success: true,
      url,
      status:  'submitted',
      message: 'URL submitted via Search Console URL Inspection API'
    };
  } catch (err) {
    const errMsg = err.message || 'Unknown error';
    await logIndexingRequest(url, type, 'failed', errMsg);
    return { success: false, url, status: 'failed', message: errMsg };
  }
}

async function batchRequestIndexing(urls, type = 'URL_UPDATED') {
  const results   = [];
  const daily     = await getDailyQuotaUsed();
  const quota     = 200;
  const available = Math.max(0, quota - daily);

  const toProcess = urls.slice(0, available);
  const skipped   = urls.slice(available);

  for (const url of toProcess) {
    const result = await requestIndexing(url, type);
    results.push(result);
    await sleep(150);
  }

  return {
    submitted:   results.filter(r => r.success).length,
    failed:      results.filter(r => !r.success && r.status !== 'skipped').length,
    skipped:     skipped.length,
    quotaUsed:   daily + results.filter(r => r.success).length,
    quotaLimit:  quota,
    results,
    skippedUrls: skipped
  };
}

async function getUrlStatus(url) {
  const auth = getGoogleAuth();
  if (!auth) return { configured: false };

  try {
    const { google }    = require('googleapis');
    const searchconsole = google.searchconsole({ version: 'v1', auth });
    const res           = await searchconsole.urlInspection.index.inspect({
      requestBody: {
        inspectionUrl: url,
        siteUrl:       process.env.GOOGLE_SITE_URL
      }
    });
    return {
      configured:      true,
      url,
      inspectionResult: res.data.inspectionResult
    };
  } catch (err) {
    return { configured: true, url, error: err.message };
  }
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  requestIndexing,
  batchRequestIndexing,
  getUrlStatus,
  getIndexingHistory,
  getDailyQuotaUsed
};
