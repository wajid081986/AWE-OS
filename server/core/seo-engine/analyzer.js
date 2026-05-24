'use strict';

/**
 * AWE-OS — SEO Audit Analyzer
 *
 * Input : URL string
 * Output: {
 *   url, score, grade,
 *   titleCheck    : { present, length, value },
 *   metaCheck     : { present, length, value },
 *   h1Count, h2Count, h3Count,
 *   wordCount,
 *   schemaPresent,
 *   canonicalPresent,
 *   imagesWithAlt, imagesMissingAlt,
 *   issues[]      : [{ severity: 'error'|'warning'|'info', message }]
 *   suggestions[] : [string]
 * }
 */

const axios   = require('axios');
const cheerio = require('cheerio');

const FETCH_TIMEOUT_MS = 12_000;
const MIN_TITLE_LEN    = 30;
const MAX_TITLE_LEN    = 60;
const MIN_META_LEN     = 70;
const MAX_META_LEN     = 160;
const MIN_WORD_COUNT   = 300;
const GOOD_WORD_COUNT  = 800;

// ── Fetch page HTML ────────────────────────────────────────────────────────────

async function fetchPage(url) {
  const res = await axios.get(url, {
    timeout: FETCH_TIMEOUT_MS,
    headers: {
      'User-Agent': 'AWE-OS-SEO-Auditor/1.0 (compatible; +https://www.awe-os.com)',
    },
    maxRedirects: 5,
    validateStatus: s => s < 400,
  });
  return res.data;
}

// ── Word count from visible text ───────────────────────────────────────────────

function countWords($) {
  const body = $('body').clone();
  body.find('script, style, noscript, iframe').remove();
  const text = body.text().replace(/\s+/g, ' ').trim();
  return text.split(' ').filter(Boolean).length;
}

// ── Score calculator ───────────────────────────────────────────────────────────

function computeScore(checks) {
  const weights = {
    title:     20,
    meta:      15,
    h1:        15,
    canonical: 10,
    schema:    10,
    wordCount:  15,
    images:     10,
    headings:    5,
  };
  let earned = 0;
  if (checks.title)     earned += weights.title;
  if (checks.meta)      earned += weights.meta;
  if (checks.h1)        earned += weights.h1;
  if (checks.canonical) earned += weights.canonical;
  if (checks.schema)    earned += weights.schema;
  if (checks.wordCount) earned += weights.wordCount;
  if (checks.images)    earned += weights.images;
  if (checks.headings)  earned += weights.headings;
  return earned;
}

function scoreToGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 55) return 'C';
  if (score >= 35) return 'D';
  return 'F';
}

// ── Main analyzer ──────────────────────────────────────────────────────────────

async function analyzeUrl(rawUrl) {
  // Normalise URL
  const url = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;

  const html = await fetchPage(url);
  const $    = cheerio.load(html);

  // Title
  const titleVal = $('title').first().text().trim();
  const titleLen = titleVal.length;
  const titleOk  = titleLen >= MIN_TITLE_LEN && titleLen <= MAX_TITLE_LEN;

  // Meta description
  const metaVal = $('meta[name="description"]').attr('content')?.trim() || '';
  const metaLen = metaVal.length;
  const metaOk  = metaLen >= MIN_META_LEN && metaLen <= MAX_META_LEN;

  // Headings
  const h1Count = $('h1').length;
  const h2Count = $('h2').length;
  const h3Count = $('h3').length;

  // Word count
  const words     = countWords($);
  const wordsOk   = words >= MIN_WORD_COUNT;

  // Schema
  const schemaPresent = $('script[type="application/ld+json"]').length > 0;

  // Canonical
  const canonicalPresent = $('link[rel="canonical"]').length > 0;

  // Images
  let imagesWithAlt    = 0;
  let imagesMissingAlt = 0;
  $('img').each((_, el) => {
    const alt = $(el).attr('alt');
    if (alt && alt.trim()) imagesWithAlt++;
    else imagesMissingAlt++;
  });
  const imagesOk = imagesMissingAlt === 0 || imagesWithAlt / (imagesWithAlt + imagesMissingAlt) >= 0.8;

  // Build issues list
  const issues     = [];
  const suggestions = [];

  if (!titleVal) {
    issues.push({ severity: 'error', message: 'Page title is missing' });
    suggestions.push('Add a descriptive <title> tag between 30–60 characters');
  } else if (titleLen < MIN_TITLE_LEN) {
    issues.push({ severity: 'warning', message: `Title too short (${titleLen} chars) — aim for 30–60` });
    suggestions.push('Expand the title to include target keyword and brand name');
  } else if (titleLen > MAX_TITLE_LEN) {
    issues.push({ severity: 'warning', message: `Title too long (${titleLen} chars) — Google truncates after 60` });
    suggestions.push('Shorten the title to under 60 characters to avoid truncation in SERPs');
  }

  if (!metaVal) {
    issues.push({ severity: 'error', message: 'Meta description is missing' });
    suggestions.push('Add a meta description (70–160 chars) to improve CTR in search results');
  } else if (metaLen < MIN_META_LEN) {
    issues.push({ severity: 'warning', message: `Meta description too short (${metaLen} chars)` });
    suggestions.push('Expand meta description to at least 70 characters');
  } else if (metaLen > MAX_META_LEN) {
    issues.push({ severity: 'warning', message: `Meta description too long (${metaLen} chars) — Google truncates after 160` });
    suggestions.push('Shorten meta description to under 160 characters');
  }

  if (h1Count === 0) {
    issues.push({ severity: 'error', message: 'No H1 tag found' });
    suggestions.push('Add exactly one H1 tag containing your primary keyword');
  } else if (h1Count > 1) {
    issues.push({ severity: 'warning', message: `Multiple H1 tags found (${h1Count}) — use only one` });
    suggestions.push('Consolidate to a single H1 tag; use H2/H3 for subheadings');
  }

  if (!canonicalPresent) {
    issues.push({ severity: 'warning', message: 'No canonical tag — duplicate content risk' });
    suggestions.push('Add <link rel="canonical"> to prevent duplicate content penalties');
  }

  if (!schemaPresent) {
    issues.push({ severity: 'info', message: 'No structured data (JSON-LD) detected' });
    suggestions.push('Add Schema.org markup (Article, FAQPage, etc.) for rich snippets');
  }

  if (words < MIN_WORD_COUNT) {
    issues.push({ severity: 'error', message: `Thin content — only ${words} words (minimum ${MIN_WORD_COUNT})` });
    suggestions.push(`Expand content to at least ${MIN_WORD_COUNT} words; aim for ${GOOD_WORD_COUNT}+ for competitive topics`);
  } else if (words < GOOD_WORD_COUNT) {
    issues.push({ severity: 'info', message: `Content is short (${words} words) — ${GOOD_WORD_COUNT}+ recommended for competitive SERPs` });
  }

  if (imagesMissingAlt > 0) {
    issues.push({ severity: 'warning', message: `${imagesMissingAlt} image(s) missing alt text` });
    suggestions.push('Add descriptive alt text to all images for accessibility and image SEO');
  }

  if (h2Count === 0 && words > 400) {
    issues.push({ severity: 'info', message: 'No H2 subheadings — long content with no structure' });
    suggestions.push('Break content into sections with H2 subheadings to improve readability and crawlability');
  }

  // Score
  const checks = {
    title:     titleOk,
    meta:      metaOk,
    h1:        h1Count === 1,
    canonical: canonicalPresent,
    schema:    schemaPresent,
    wordCount: wordsOk,
    images:    imagesOk,
    headings:  h2Count > 0,
  };
  const score = computeScore(checks);
  const grade = scoreToGrade(score);

  return {
    url,
    score,
    grade,
    titleCheck:      { present: !!titleVal, length: titleLen, value: titleVal },
    metaCheck:       { present: !!metaVal,  length: metaLen,  value: metaVal  },
    h1Count,
    h2Count,
    h3Count,
    wordCount:       words,
    schemaPresent,
    canonicalPresent,
    imagesWithAlt,
    imagesMissingAlt,
    issues,
    suggestions,
  };
}

module.exports = { analyzeUrl };
