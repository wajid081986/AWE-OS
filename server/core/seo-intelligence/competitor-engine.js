'use strict';
const { getOpenAI } = require('../ai-engine');
const parseAIJson   = require('../../services/parseAIJson');
const { crawlPage } = require('../crawl-engine/crawler');

// Explicit per-call ceiling instead of the SDK's ~10min default.
const OPENAI_CALL_OPTS = { timeout: 90_000, maxRetries: 3 };

async function analyzeCompetitorGap(ourUrl, competitorUrls, topic) {
  const openai = getOpenAI();

  const [ourResult, ...compResults] = await Promise.allSettled([
    crawlPage(ourUrl, new URL(ourUrl).hostname),
    ...competitorUrls.slice(0, 3).map(url =>
      crawlPage(url, new URL(url).hostname).catch(() => null)
    ),
  ]);

  const ourData  = ourResult.status === 'fulfilled' ? ourResult.value : {};
  const compData = compResults
    .filter(p => p.status === 'fulfilled' && p.value)
    .map(p => p.value);

  const gapPrompt = `
You are an expert SEO analyst.
Compare our page vs competitors and find gaps.

OUR PAGE:
- URL: ${ourUrl}
- Title: ${ourData.title || 'N/A'}
- Word Count: ${ourData.wordCount || 0}
- H2 Count: ${(ourData.h2s || []).length}
- Has Schema: ${(ourData.schemas || []).length > 0}
- Internal Links: ${(ourData.internalLinks || []).length}

COMPETITOR PAGES:
${compData.map((c, i) => `
Competitor ${i + 1}:
- URL: ${c.url}
- Title: ${c.title || 'N/A'}
- Word Count: ${c.wordCount || 0}
- H2 headings: ${(c.h2s || []).slice(0, 5).join(' | ') || 'N/A'}
- Has Schema: ${(c.schemas || []).length > 0}
`).join('\n')}

Topic: ${topic || 'general'}

Analyze and return JSON:
{
  "overallScore": {
    "ours": 60,
    "avgCompetitor": 75,
    "gap": -15
  },
  "contentGaps": [
    {
      "gap": "what competitors cover that we don't",
      "importance": "high|medium|low",
      "recommendation": "what to add"
    }
  ],
  "structureGaps": [
    {
      "element": "H2/Schema/FAQ/Table etc",
      "competitorHas": true,
      "weHave": false,
      "recommendation": "action"
    }
  ],
  "wordCountGap": {
    "ours": 500,
    "avgCompetitor": 1200,
    "recommendation": "add X more words about Y"
  },
  "quickWins": [
    "specific actionable improvement"
  ],
  "priorityActions": [
    {
      "action": "what to do",
      "impact": "high|medium|low",
      "effort": "low|medium|high"
    }
  ]
}
Return ONLY JSON.
`.trim();

  const res = await openai.chat.completions.create({
    model:      'gpt-4o',
    max_tokens: 2000,
    messages: [
      { role: 'system', content: 'You are an expert SEO analyst. Return only valid JSON.' },
      { role: 'user',   content: gapPrompt },
    ],
  }, OPENAI_CALL_OPTS);

  const analysis = parseAIJson(res.choices[0].message.content) || {};

  return {
    ourUrl,
    competitorUrls: competitorUrls.slice(0, 3),
    topic,
    ourPageData: {
      title:         ourData.title,
      wordCount:     ourData.wordCount,
      h1Count:       (ourData.h1s || []).length,
      h2Count:       (ourData.h2s || []).length,
      hasSchema:     (ourData.schemas || []).length > 0,
      internalLinks: (ourData.internalLinks || []).length,
    },
    competitorSummary: compData.map(c => ({
      url:       c.url,
      title:     c.title,
      wordCount: c.wordCount,
      h2Count:   (c.h2s || []).length,
      hasSchema: (c.schemas || []).length > 0,
    })),
    analysis,
    analyzedAt: new Date().toISOString(),
  };
}

async function identifyCompetitors(keyword, ourDomain) {
  const openai = getOpenAI();

  const res = await openai.chat.completions.create({
    model:      'gpt-4o-mini',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `
For keyword "${keyword}" targeting Indian users,
list the top 5 competing websites (NOT ${ourDomain}).

Return JSON:
{
  "competitors": [
    {
      "domain": "example.com",
      "type": "tool-site|blog|calculator|comparison",
      "strength": "high|medium|low",
      "whyTheyRank": "one sentence",
      "ourAdvantage": "what we do better"
    }
  ]
}
Return ONLY JSON.`,
    }],
  }, OPENAI_CALL_OPTS);

  return parseAIJson(res.choices[0].message.content) || { competitors: [] };
}

module.exports = { analyzeCompetitorGap, identifyCompetitors };
