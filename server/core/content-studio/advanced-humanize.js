'use strict';
const { getOpenAI } = require('../ai-engine');
const parseAIJson   = require('../../services/parseAIJson');

// Batch 48 — new helpers only. humanizer.js and index.js stay untouched
// per CLAUDE.md §3b ("reused as-is"); this file is a sibling, not a
// rewrite. Same per-call timeout/retry pattern as batch-47's fix in
// humanizer.js.
const OPENAI_CALL_OPTS = { timeout: 60_000, maxRetries: 3 };

const AI_TITLE_PATTERNS = [
  'Unlock Your', 'Transform Your', 'Discover', 'Unleash', 'Elevate Your',
  'The Ultimate Guide to', 'Everything You Need to Know About',
  "Here's Why", 'Boost Your', 'Revolutionize',
];

// Seeded from humanizer.js's existing prompt list (Furthermore, Moreover,
// Additionally, In conclusion, It is worth noting) plus other common
// GPT-tell phrases.
const EXTENDED_AI_PHRASES = [
  'furthermore', 'moreover', 'additionally', 'in conclusion',
  'it is worth noting', "it's important to note", 'dive into', 'unlock',
  'elevate', 'seamless', 'seamlessly', 'robust', 'testament to',
  'in the realm of', 'when it comes to', 'navigating', 'unleash',
  'game-changer', 'game changer', 'delve', "in today's fast-paced world",
  'boasts', 'plethora', 'tapestry', 'landscape of', 'in summary',
  'a testament to', 'at the end of the day', 'needless to say',
];

// ── Title Humanizer (Feature 1) ─────────────────────────────────────────────

async function humanizeTitle(title, targetKeyword = '') {
  const openai = getOpenAI();
  const prompt = `
Rewrite this blog post title to sound human-written, not AI-generated.

AVOID generic hook-word openers like: ${AI_TITLE_PATTERNS.join(', ')}.
${targetKeyword ? `Keep this exact keyword phrase in the title: "${targetKeyword}"` : ''}
Keep it a single line, under 70 characters, no surrounding quotes.

ORIGINAL TITLE:
"${title}"

Return JSON:
{
  "humanizedTitle": "...",
  "titleAiScoreBefore": 0-100 (higher = more AI-like; estimate for the ORIGINAL title),
  "titleAiScoreAfter": 0-100 (higher = more AI-like; estimate for the REWRITTEN title)
}
Return ONLY JSON.`.trim();

  const res = await openai.chat.completions.create({
    model:       'gpt-4o-mini',
    max_tokens:  300,
    temperature: 0.6,
    messages: [
      { role: 'system', content: 'Return only valid JSON.' },
      { role: 'user',   content: prompt }
    ]
  }, OPENAI_CALL_OPTS);

  const parsed = parseAIJson(res.choices[0].message.content) || {};
  return {
    humanizedTitle:      parsed.humanizedTitle || title,
    titleAiScoreBefore:  parsed.titleAiScoreBefore  ?? null,
    titleAiScoreAfter:   parsed.titleAiScoreAfter   ?? null,
  };
}

// ── Meta description humanize (Feature 2) ───────────────────────────────────

async function humanizeMetaDescription(metaDescription, targetKeyword = '') {
  const openai = getOpenAI();
  const prompt = `
Rewrite this meta description to sound human-written and naturally
compelling, not AI-generated boilerplate. Must be 150-160 characters
(count carefully).
${targetKeyword ? `Keep this exact keyword phrase in it: "${targetKeyword}"` : ''}

ORIGINAL META DESCRIPTION:
"${metaDescription || ''}"

Return ONLY the rewritten meta description text. No quotes, no JSON, no
explanation — just the 150-160 character description.`.trim();

  const res = await openai.chat.completions.create({
    model:       'gpt-4o-mini',
    max_tokens:  150,
    temperature: 0.6,
    messages: [
      { role: 'system', content: 'You write concise, human-sounding SEO meta descriptions.' },
      { role: 'user',   content: prompt }
    ]
  }, OPENAI_CALL_OPTS);

  const humanizedMetaDescription = (res.choices[0].message.content || '').trim().replace(/^"|"$/g, '');
  return { humanizedMetaDescription };
}

// ── Keyword density (pure JS, same arithmetic as content-scorer.js) ────────

function analyzeKeywordDensity(text, targetKeyword) {
  const clean     = String(text || '').replace(/<[^>]+>/g, ' ');
  const wordCount = clean.split(/\s+/).filter(Boolean).length;
  if (!targetKeyword || !wordCount) {
    return { count: 0, density: 0, wordCount, target: '3-5 uses', inRange: false };
  }
  const escaped = targetKeyword.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const count   = (clean.match(new RegExp(escaped, 'gi')) || []).length;
  const density = wordCount ? Math.round((count / wordCount) * 10000) / 100 : 0;
  return { count, density, wordCount, target: '3-5 uses', inRange: count >= 3 && count <= 5 };
}

// ── Readability — Flesch-Kincaid Reading Ease (pure JS, no dependency) ─────

function countSyllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const reduced = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const matches = reduced.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

function computeReadability(text) {
  const clean     = String(text || '').replace(/<[^>]+>/g, ' ');
  const words     = clean.split(/\s+/).filter(Boolean);
  const sentences = clean.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const wordCount     = words.length;
  const sentenceCount = sentences.length || 1;
  if (!wordCount) return { fleschScore: 0, wordCount: 0, sentenceCount: 0, avgWordsPerSentence: 0 };

  const syllableCount        = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const avgWordsPerSentence  = wordCount / sentenceCount;
  const avgSyllablesPerWord  = syllableCount / wordCount;
  const raw         = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
  const fleschScore = Math.max(0, Math.min(100, Math.round(raw)));

  return {
    fleschScore,
    wordCount,
    sentenceCount,
    avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
  };
}

// ── Internal link check (pure JS) ────────────────────────────────────────────
// Scans the two representations already used in blog_posts.content: inline
// <a href='/tools/...'> in "p" blocks, and callout.links[].href.

function checkInternalLinks(blocks) {
  const list = Array.isArray(blocks) ? blocks : [];
  let internalCount = 0;
  let totalCount     = 0;
  const hrefRe = /<a\s+[^>]*href=['"]([^'"]+)['"]/gi;

  for (const b of list) {
    if (b?.type === 'p' && typeof b.text === 'string') {
      let m;
      while ((m = hrefRe.exec(b.text)) !== null) {
        totalCount++;
        if (m[1].startsWith('/') || m[1].includes('awe-os.com')) internalCount++;
      }
    }
    if (b?.type === 'callout' && Array.isArray(b.links)) {
      for (const l of b.links) {
        if (!l?.href) continue;
        totalCount++;
        if (l.href.startsWith('/') || l.href.includes('awe-os.com')) internalCount++;
      }
    }
  }

  return { internalLinkCount: internalCount, totalLinkCount: totalCount, target: '2-3', meetsTarget: internalCount >= 2 };
}

// ── Advanced AI detection (Feature 3, pure JS — no OpenAI call) ────────────
// "predictability" below is a heuristic proxy for text predictability, NOT
// literal GPT log-probability perplexity — true LM perplexity needs token
// log-probabilities that the Chat Completions API doesn't expose for
// arbitrary input text. See batch-48 plan for the full caveat; the UI must
// label this as an estimate, same as ai_score already is.

function splitSentences(text) {
  return String(text || '').split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
}

function burstinessScore(text) {
  const sentences = splitSentences(text);
  if (sentences.length < 2) {
    const only = sentences[0]?.split(/\s+/).filter(Boolean).length || 0;
    return { stdev: 0, avgLen: only };
  }
  const lens     = sentences.map(s => s.split(/\s+/).filter(Boolean).length);
  const avg      = lens.reduce((a, b) => a + b, 0) / lens.length;
  const variance = lens.reduce((sum, l) => sum + (l - avg) ** 2, 0) / lens.length;
  return { stdev: Math.round(Math.sqrt(variance) * 10) / 10, avgLen: Math.round(avg * 10) / 10 };
}

function vocabularyRichness(text) {
  const words = String(text || '').toLowerCase().match(/[a-z']+/g) || [];
  if (!words.length) return 0;
  const unique = new Set(words);
  return Math.round((unique.size / words.length) * 1000) / 1000; // type-token ratio, 0-1
}

function aiPhraseStats(text) {
  const lower     = String(text || '').toLowerCase();
  const wordCount = lower.split(/\s+/).filter(Boolean).length || 1;
  let hits = 0;
  for (const phrase of EXTENDED_AI_PHRASES) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    hits += (lower.match(new RegExp(escaped, 'g')) || []).length;
  }
  return { hits, density: Math.round((hits / wordCount) * 1000) / 1000 };
}

// Weighted heuristic: low sentence-length variance (0.4) + low vocabulary
// richness (0.35) + AI-phrase density (0.25) => higher predictability score.
function predictabilityProxy(stdev, ttr, phraseDensity) {
  const burstinessFactor = Math.max(0, 1 - stdev / 8);
  const vocabFactor       = Math.max(0, 1 - ttr);
  const phraseFactor      = Math.min(1, phraseDensity * 40);
  const score = burstinessFactor * 0.4 + vocabFactor * 0.35 + phraseFactor * 0.25;
  return Math.round(Math.max(0, Math.min(1, score)) * 100);
}

function computeAdvancedDetection(humanizedText) {
  const { stdev, avgLen } = burstinessScore(humanizedText);
  const ttr                = vocabularyRichness(humanizedText);
  const { hits, density }  = aiPhraseStats(humanizedText);
  const predictability     = predictabilityProxy(stdev, ttr, density);
  // Combined score: 60% predictability proxy (already folds in burstiness +
  // vocab richness), 40% raw AI-phrase density, scaled to 0-100.
  const combinedDetectionScore = Math.round(
    predictability * 0.6 + Math.min(100, density * 4000) * 0.4
  );

  return {
    burstiness:         stdev,
    avgSentenceLength:  avgLen,
    vocabularyRichness: ttr,
    aiPhraseCount:       hits,
    aiPhraseDensity:      density,
    predictability,
    combinedDetectionScore: Math.max(0, Math.min(100, combinedDetectionScore)),
  };
}

module.exports = {
  AI_TITLE_PATTERNS,
  EXTENDED_AI_PHRASES,
  humanizeTitle,
  humanizeMetaDescription,
  analyzeKeywordDensity,
  computeReadability,
  checkInternalLinks,
  computeAdvancedDetection,
};
