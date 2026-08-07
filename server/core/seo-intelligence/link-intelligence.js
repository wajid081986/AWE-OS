'use strict';
const { getOpenAI } = require('../ai-engine');
const parseAIJson   = require('../../services/parseAIJson');

// Explicit per-call ceiling instead of the SDK's ~10min default.
const OPENAI_CALL_OPTS = { timeout: 60_000, maxRetries: 3 };

async function analyzeInternalLinks(pages, targetUrl) {
  const openai = getOpenAI();

  const relevantPages = pages
    .filter(p => p.url !== targetUrl)
    .slice(0, 30);

  const prompt = `
You are an internal linking SEO expert.

TARGET PAGE: ${targetUrl}

AVAILABLE PAGES TO LINK FROM/TO:
${relevantPages.map(p =>
  `- ${p.url} | "${p.title || 'No title'}" | ${p.wordCount || 0} words | ${p.issues || 0} issues`
).join('\n')}

Analyze and return optimal internal linking strategy:

Return JSON:
{
  "linkingOpportunities": [
    {
      "fromUrl": "page that should link to target",
      "anchorText": "suggested anchor text",
      "context": "where in the page to add link",
      "relevanceScore": 8,
      "reason": "why this link makes sense"
    }
  ],
  "linksFromTarget": [
    {
      "toUrl": "page target should link to",
      "anchorText": "suggested anchor text",
      "reason": "topical relevance reason"
    }
  ],
  "orphanRisk": "high|medium|low",
  "authorityScore": 7,
  "recommendations": [
    "specific actionable recommendation"
  ]
}
Return ONLY JSON.
`.trim();

  const res = await openai.chat.completions.create({
    model:      'gpt-4o-mini',
    max_tokens: 2000,
    messages: [
      { role: 'system', content: 'You are an internal linking expert. Return only JSON.' },
      { role: 'user',   content: prompt },
    ],
  }, OPENAI_CALL_OPTS);

  return parseAIJson(res.choices[0].message.content) ||
    { linkingOpportunities: [], linksFromTarget: [], recommendations: [] };
}

async function fixOrphanPages(orphanUrls, allPages) {
  const openai = getOpenAI();

  const res = await openai.chat.completions.create({
    model:      'gpt-4o-mini',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `
These pages have NO internal links pointing to them (orphans):
${orphanUrls.slice(0, 15).join('\n')}

Available pages that could link to them:
${allPages.slice(0, 20).map(p => `- ${p.url || p}: ${p.title || ''}`).join('\n')}

For each orphan, suggest the BEST page to link from.

Return JSON:
{
  "fixes": [
    {
      "orphanUrl": "orphan page URL",
      "linkFromUrl": "best page to add link from",
      "anchorText": "suggested anchor text",
      "confidence": "high|medium|low"
    }
  ]
}
Return ONLY JSON.`,
    }],
  }, OPENAI_CALL_OPTS);

  return parseAIJson(res.choices[0].message.content) || { fixes: [] };
}

module.exports = { analyzeInternalLinks, fixOrphanPages };
