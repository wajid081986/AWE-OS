'use strict';
const { getOpenAI } = require('../ai-engine');

// Robust JSON extractor — handles markdown fences, leading text, trailing text
function extractJson(text) {
  const s = (text || '').trim();
  try { return JSON.parse(s); } catch {}

  const arrMatch = s.match(/\[[\s\S]*\]/);
  if (arrMatch) { try { return JSON.parse(arrMatch[0]); } catch {} }

  const objMatch = s.match(/\{[\s\S]*\}/);
  if (objMatch) { try { return JSON.parse(objMatch[0]); } catch {} }

  const stripped = s.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try { return JSON.parse(stripped); } catch {}

  return null;
}

const STRICT_JSON_SYSTEM =
  'You must respond with ONLY a valid JSON value. ' +
  'No markdown, no backticks, no explanation, no trailing text. ' +
  'If returning an array start with [ and end with ]. ' +
  'If returning an object start with { and end with }.';

// Explicit per-call ceiling instead of the SDK's ~10min default — clustering
// genuinely needs the keyword list from the first call, so these can't run
// in parallel, but each still needs its own cap so a stalled call fails fast.
const OPENAI_CALL_OPTS = { timeout: 60_000, maxRetries: 3 };

async function researchKeywords(seedKeyword, opts = {}) {
  const {
    country     = 'India',
    language    = 'English',
    toolSlug    = null,
    maxKeywords = 50,
  } = opts;

  const openai = getOpenAI();

  const keywordPrompt = `
You are an expert SEO keyword researcher for Indian market.

Seed keyword: "${seedKeyword}"
Country: ${country}
Language: ${language}
${toolSlug ? `Tool/Product: ${toolSlug}` : ''}

Generate ${maxKeywords} keyword variations. Include:
- Short tail (1-2 words)
- Long tail (3-5 words)
- Question keywords (what, how, why, which)
- Comparison keywords (vs, alternative, best)
- Local Indian variants
- Year-based variants (2025, 2026)

For each keyword return JSON array:
[{
  "keyword": "exact keyword phrase",
  "searchIntent": "informational|navigational|commercial|transactional",
  "difficulty": "low|medium|high",
  "estimatedVolume": "low(<1k)|medium(1k-10k)|high(10k-100k)|very_high(100k+)",
  "cpc": "low|medium|high",
  "indiaRelevant": true,
  "priority": 1
}]

Return ONLY the JSON array. No explanation.
`.trim();

  const kwRes = await openai.chat.completions.create({
    model:       'gpt-4o-mini',
    max_tokens:  3000,
    temperature: 0,
    messages: [
      { role: 'system', content: STRICT_JSON_SYSTEM },
      { role: 'user',   content: keywordPrompt },
    ],
  }, OPENAI_CALL_OPTS);

  const kwRaw    = kwRes.choices[0].message.content;
  const keywords = extractJson(kwRaw);
  if (!Array.isArray(keywords) || keywords.length === 0) {
    console.error('[keyword-engine] keyword parse failed. Raw:', kwRaw.slice(0, 200));
    throw new Error('Keyword research failed: could not parse AI response as JSON array');
  }

  const clusterPrompt = `
Cluster these ${keywords.length} keywords into topic groups for content planning.

Keywords: ${JSON.stringify(keywords.map(k => k.keyword))}

Return JSON:
{
  "clusters": [
    {
      "clusterName": "Topic Group Name",
      "pillarKeyword": "main keyword for this cluster",
      "intent": "informational|commercial|transactional",
      "keywords": ["keyword1", "keyword2"],
      "contentSuggestion": "Suggested article/page title",
      "priority": "high|medium|low"
    }
  ]
}

Return ONLY JSON. No explanation.
`.trim();

  const clusterRes = await openai.chat.completions.create({
    model:       'gpt-4o-mini',
    max_tokens:  2000,
    temperature: 0,
    messages: [
      { role: 'system', content: STRICT_JSON_SYSTEM },
      { role: 'user',   content: clusterPrompt },
    ],
  }, OPENAI_CALL_OPTS);

  const clusterRaw = clusterRes.choices[0].message.content;
  const clusters   = extractJson(clusterRaw) || { clusters: [] };
  if (!clusters.clusters) {
    console.error('[keyword-engine] cluster parse failed. Raw:', clusterRaw.slice(0, 200));
    clusters.clusters = [];
  }

  const keywordMap = {};
  keywords.forEach(k => { keywordMap[k.keyword] = k; });

  clusters.clusters = (clusters.clusters || []).map(cluster => ({
    ...cluster,
    keywordData:   cluster.keywords.map(kw => keywordMap[kw] || { keyword: kw }),
    totalKeywords: cluster.keywords.length,
  }));

  return {
    seedKeyword,
    country,
    totalKeywords:    keywords.length,
    totalClusters:    clusters.clusters.length,
    keywords:         keywords.sort((a, b) => b.priority - a.priority),
    clusters:         clusters.clusters,
    topOpportunities: keywords
      .filter(k => k.difficulty === 'low' && k.estimatedVolume !== 'low(<1k)')
      .slice(0, 10),
    analyzedAt: new Date().toISOString(),
  };
}

async function checkKeywordDifficulty(keyword) {
  const openai = getOpenAI();

  const res = await openai.chat.completions.create({
    model:       'gpt-4o-mini',
    max_tokens:  500,
    temperature: 0,
    messages: [
      { role: 'system', content: STRICT_JSON_SYSTEM },
      {
        role: 'user',
        content: `Analyze SEO difficulty for keyword: "${keyword}" in India.

Return JSON object:
{
  "keyword": "${keyword}",
  "difficulty": "low|medium|high|very_high",
  "difficultyScore": 45,
  "searchIntent": "informational|navigational|commercial|transactional",
  "estimatedVolume": "low|medium|high|very_high",
  "topCompetitors": ["site1.com", "site2.com", "site3.com"],
  "rankingOpportunity": "high|medium|low",
  "recommendation": "one sentence advice",
  "contentType": "article|tool|calculator|comparison|faq"
}`,
      },
    ],
  });

  const raw    = res.choices[0].message.content;
  const result = extractJson(raw);
  if (!result) {
    console.error('[keyword-engine] difficulty parse failed. Raw:', raw.slice(0, 200));
    throw new Error('Keyword difficulty check failed: could not parse AI response');
  }
  return result;
}

module.exports = { researchKeywords, checkKeywordDifficulty };
