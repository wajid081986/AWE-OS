'use strict';
const axios = require('axios');

/**
 * Dynamic Sitemap Generator
 * Reads URL inventory from the live sitemap + Supabase
 * and builds a fresh XML payload on demand.
 */

const BASE_URL = process.env.FRONTEND_URL || 'https://www.awe-os.com';

async function collectAllUrls() {
  const urls = [];
  const now  = new Date().toISOString().split('T')[0];

  // Static pages
  const staticPages = [
    { url: '/',               priority: '1.0', changefreq: 'weekly'  },
    { url: '/tools',          priority: '0.9', changefreq: 'weekly'  },
    { url: '/blog',           priority: '0.8', changefreq: 'daily'   },
    { url: '/pricing',        priority: '0.7', changefreq: 'monthly' },
    { url: '/about',          priority: '0.5', changefreq: 'monthly' },
    { url: '/contact',        priority: '0.5', changefreq: 'monthly' },
    { url: '/privacy-policy', priority: '0.3', changefreq: 'yearly'  },
    { url: '/terms',          priority: '0.3', changefreq: 'yearly'  },
  ];
  staticPages.forEach(p => urls.push({
    ...p,
    url:     `${BASE_URL}${p.url}`,
    lastmod: now
  }));

  // Fetch live sitemap and extract all URL patterns
  try {
    const res  = await axios.get(`${BASE_URL}/sitemap.xml`, { timeout: 8000 });
    const xml  = res.data;

    const patterns = [
      { re: /<loc>(https?:\/\/[^<]+\/tools\/[^<]+)<\/loc>/g,      priority: '0.8', changefreq: 'monthly' },
      { re: /<loc>(https?:\/\/[^<]+\/blog\/[^<]+)<\/loc>/g,       priority: '0.7', changefreq: 'weekly'  },
      { re: /<loc>(https?:\/\/[^<]+\/compare\/[^<]+)<\/loc>/g,    priority: '0.6', changefreq: 'monthly' },
      { re: /<loc>(https?:\/\/[^<]+\/faq\/[^<]+)<\/loc>/g,        priority: '0.6', changefreq: 'monthly' },
      { re: /<loc>(https?:\/\/[^<]+-calculator\/[^<]+)<\/loc>/g,  priority: '0.6', changefreq: 'monthly' },
      { re: /<loc>(https?:\/\/[^<]+\/calculators\/[^<]+)<\/loc>/g,priority: '0.8', changefreq: 'monthly' },
    ];

    for (const { re, priority, changefreq } of patterns) {
      for (const m of xml.matchAll(re)) {
        urls.push({ url: m[1], priority, changefreq, lastmod: now });
      }
    }
  } catch {}

  // Live tools from Supabase
  try {
    const supabase = require('../../db/supabase');
    const { data: liveTools } = await supabase
      .from('tools')
      .select('slug, updated_at')
      .eq('status', 'live');

    (liveTools || []).forEach(t => {
      if (t.slug) urls.push({
        url:        `${BASE_URL}/tools/${t.slug}`,
        priority:   '0.7',
        changefreq: 'weekly',
        lastmod:    t.updated_at?.split('T')[0] || now
      });
    });
  } catch {}

  // Deduplicate
  const seen   = new Set();
  return urls.filter(u => {
    if (seen.has(u.url)) return false;
    seen.add(u.url);
    return true;
  });
}

function generateSitemapXml(urls) {
  const entries = urls.map(u => `
  <url>
    <loc>${escapeXml(u.url)}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq || 'monthly'}</changefreq>
    <priority>${u.priority || '0.5'}</priority>
  </url>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`;
}

async function getSitemapStats() {
  try {
    const urls   = await collectAllUrls();
    const byType = {};

    urls.forEach(u => {
      const path = new URL(u.url).pathname;
      const type = path === '/'                          ? 'home'
                 : path.startsWith('/tools/')            ? 'tool'
                 : path.startsWith('/blog/')             ? 'blog'
                 : path.startsWith('/compare/')          ? 'comparison'
                 : path.startsWith('/faq/')              ? 'faq'
                 : path.startsWith('/calculators/')      ? 'calculator'
                 : path.includes('-calculator/')         ? 'city'
                 : 'static';
      byType[type] = (byType[type] || 0) + 1;
    });

    return { total: urls.length, byType, lastGenerated: new Date().toISOString() };
  } catch (err) {
    return { total: 0, error: err.message };
  }
}

function escapeXml(str) {
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;');
}

module.exports = { collectAllUrls, generateSitemapXml, getSitemapStats };
