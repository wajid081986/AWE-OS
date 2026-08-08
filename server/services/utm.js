'use strict';

/**
 * Shared UTM-tagging helper for outbound social links.
 * Callers pass the existing destination URL; this appends standard
 * utm_source/utm_medium/utm_campaign params without altering anything
 * else about the URL.
 */

function buildTrackedUrl(baseUrl, { source, medium, campaign }) {
  const url = new URL(baseUrl);
  url.searchParams.set('utm_source', source);
  url.searchParams.set('utm_medium', medium);
  url.searchParams.set('utm_campaign', campaign);
  return url.toString();
}

module.exports = { buildTrackedUrl };
