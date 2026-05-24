'use strict';

const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'gclid', 'ref', 'source', 'mc_cid', 'mc_eid',
  '_ga', '_gl', 'msclkid', 'twclid',
]);

const SKIP_EXTENSIONS = new Set([
  '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico',
  '.zip', '.tar', '.gz', '.mp4', '.mp3', '.wav',
  '.css', '.js', '.woff', '.woff2', '.ttf',
]);

function normalizeUrl(rawUrl, baseUrl) {
  try {
    const url = new URL(rawUrl, baseUrl);
    url.hash  = '';
    url.hostname = url.hostname.toLowerCase();
    if ((url.protocol === 'http:'  && url.port === '80') ||
        (url.protocol === 'https:' && url.port === '443')) {
      url.port = '';
    }
    for (const key of [...url.searchParams.keys()]) {
      if (TRACKING_PARAMS.has(key)) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    let href = url.toString();
    if (href.endsWith('/') && url.pathname !== '/') href = href.slice(0, -1);
    return href;
  } catch {
    return null;
  }
}

function isCrawlable(url, allowedHost) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    if (parsed.hostname !== allowedHost) return false;
    const lastDot = parsed.pathname.lastIndexOf('.');
    if (lastDot !== -1) {
      const ext = parsed.pathname.slice(lastDot).toLowerCase();
      if (SKIP_EXTENSIONS.has(ext)) return false;
    }
    return true;
  } catch {
    return false;
  }
}

module.exports = { normalizeUrl, isCrawlable };
