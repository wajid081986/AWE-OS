'use strict';

/**
 * Fetches a relevant featured image for a blog topic from Unsplash.
 * Returns null (never throws) when UNSPLASH_ACCESS_KEY is missing or the
 * API call fails — a featured image is a nice-to-have, not a hard dependency
 * for blog generation.
 *
 * @param {string} query - Search terms, e.g. the blog topic or keyword
 * @returns {Promise<{ url: string, alt: string, credit: string, creditUrl: string } | null>}
 */
module.exports = async function fetchFeaturedImage(query) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key || !query) return null;

  try {
    const params = new URLSearchParams({
      query,
      per_page: '1',
      orientation: 'landscape',
      content_filter: 'high',
    });
    const res = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
      headers: { Authorization: `Client-ID ${key}` },
    });
    if (!res.ok) return null;

    const data  = await res.json();
    const photo = data.results?.[0];
    if (!photo) return null;

    return {
      url:       photo.urls?.regular || photo.urls?.full || '',
      alt:       photo.alt_description || query,
      credit:    photo.user?.name || 'Unsplash',
      creditUrl: photo.user?.links?.html || 'https://unsplash.com',
    };
  } catch (err) {
    console.error('[unsplashImage]', err.message);
    return null;
  }
};
