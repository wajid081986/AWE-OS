'use strict';
const { getOpenAI } = require('../ai-engine');
const parseAIJson   = require('../../services/parseAIJson');

// Explicit per-call ceiling instead of the SDK's ~10min default.
const OPENAI_CALL_OPTS = { timeout: 90_000, maxRetries: 3 };

async function findContentOpportunities(opts = {}) {
  const {
    existingPages  = [],
    targetKeywords = [],
    niche          = 'free online tools India',
    toolCategories = [],
  } = opts;

  const openai = getOpenAI();

  const prompt = `
You are a content strategist for an Indian SEO tools website.

EXISTING CONTENT (${existingPages.length} pages):
${existingPages.slice(0, 20).map(p => `- ${p}`).join('\n')}

TARGET KEYWORDS: ${targetKeywords.slice(0, 10).join(', ')}
NICHE: ${niche}
TOOL CATEGORIES: ${toolCategories.join(', ')}

Find the BEST content opportunities.
Focus on: high search volume, low competition, Indian market.

Return JSON:
{
  "opportunities": [
    {
      "type": "blog|comparison|faq|city-page|tool-page",
      "title": "Exact page title",
      "slug": "url-slug",
      "targetKeyword": "primary keyword",
      "secondaryKeywords": ["kw1", "kw2"],
      "estimatedVolume": "low|medium|high|very_high",
      "difficulty": "low|medium|high",
      "priority": 8,
      "reason": "why this opportunity exists",
      "contentOutline": ["H2 section 1", "H2 section 2", "H2 section 3"],
      "wordCountTarget": 1200,
      "indiaSpecific": true
    }
  ],
  "quickWins": [
    {
      "action": "specific thing to do",
      "url": "existing page URL if applicable",
      "impact": "high|medium|low"
    }
  ],
  "contentGaps": [
    "topic not covered but competitors cover"
  ]
}

Return top 15 opportunities. Return ONLY JSON.
`.trim();

  const res = await openai.chat.completions.create({
    model:      'gpt-4o',
    max_tokens: 3000,
    messages: [
      { role: 'system', content: 'You are a content strategy expert. Return only valid JSON.' },
      { role: 'user',   content: prompt },
    ],
  }, OPENAI_CALL_OPTS);

  const result = parseAIJson(res.choices[0].message.content) ||
    { opportunities: [], quickWins: [], contentGaps: [] };

  result.opportunities = (result.opportunities || []).sort((a, b) => b.priority - a.priority);

  return {
    ...result,
    totalOpportunities: result.opportunities.length,
    highPriority:       result.opportunities.filter(o => o.priority >= 8).length,
    analyzedAt:         new Date().toISOString(),
  };
}

async function generateContentBrief(opportunity) {
  const openai = getOpenAI();

  const res = await openai.chat.completions.create({
    model:      'gpt-4o',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `
Create a detailed SEO content brief for:
Title: "${opportunity.title}"
Target Keyword: "${opportunity.targetKeyword}"
Type: ${opportunity.type}
Target: Indian users

Return JSON:
{
  "brief": {
    "targetKeyword": "${opportunity.targetKeyword}",
    "secondaryKeywords": [],
    "searchIntent": "informational|commercial|transactional",
    "wordCountTarget": ${opportunity.wordCountTarget || 1500},
    "titleTag": "SEO optimized title (max 60 chars)",
    "metaDescription": "compelling meta description (max 155 chars)",
    "h1": "exact H1 text",
    "outline": [
      {
        "h2": "Section heading",
        "keyPoints": ["point 1", "point 2"],
        "wordCount": 200
      }
    ],
    "faqs": [
      { "q": "question", "a": "brief answer" }
    ],
    "internalLinksToAdd": ["suggested internal links"],
    "schemaType": "Article|FAQ|HowTo",
    "writingNotes": "specific instructions for writer"
  }
}
Return ONLY JSON.`,
    }],
  }, OPENAI_CALL_OPTS);

  return parseAIJson(res.choices[0].message.content) || {};
}

module.exports = { findContentOpportunities, generateContentBrief };
