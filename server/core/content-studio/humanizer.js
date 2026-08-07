'use strict';
const { getOpenAI } = require('../ai-engine');
const parseAIJson   = require('../../services/parseAIJson');

// Per-call SDK timeout + built-in exponential-backoff retry (429/5xx/network
// errors) — without this, a slow gpt-4o call on a long post has no ceiling
// and can hang well past the client's request timeout. See CLAUDE.md §3b
// "unless a bug blocks integration" — this fixes the 14/56 bulk-humanize
// failures from the 2026-08-06 Published Posts run.
const OPENAI_CALL_OPTS = { timeout: 90_000, maxRetries: 3 };

async function humanizeContent(content, opts = {}) {
  const {
    tone             = 'conversational',
    targetAudience   = 'Indian professionals',
    preserveKeywords = [],
    addPersonality   = true,
    preserveMarkers  = false
  } = opts;

  const openai = getOpenAI();

  const analyzePrompt = `
Analyze this content for AI writing patterns.
Identify: robotic phrasing, repetitive structures,
generic transitions, overly formal language,
missing personality, lack of first-person voice.

Content:
"""
${content.slice(0, 3000)}
"""

Return JSON:
{
  "aiScore": 0-100 (higher = more AI-like),
  "patterns": [
    {
      "type": "robotic_phrase|generic_transition|repetition|formal_language",
      "example": "exact phrase from content",
      "suggestion": "more human alternative"
    }
  ],
  "overallAssessment": "one sentence",
  "humanizationPriority": "high|medium|low"
}
Return ONLY JSON.`.trim();

  const humanizePrompt = `
Rewrite this content to sound completely human-written.

RULES:
- Tone: ${tone}
- Target audience: ${targetAudience}
- Keep all facts and information accurate
- Preserve these keywords exactly: ${preserveKeywords.join(', ')}
- Add natural transitions (not "Furthermore", "Moreover", "Additionally")
- Use contractions naturally (it's, you'll, we've)
- Add occasional conversational asides
- Vary sentence length (mix short punchy and longer explanatory)
- Remove corporate/AI phrases like "In conclusion", "It is worth noting"
- Add specific Indian examples/context where relevant
- Make it feel like a knowledgeable friend explaining, not a textbook
${addPersonality ? '- Add light personality and warmth' : ''}
${preserveMarkers ? '- CRITICAL: The text contains marker lines matching the exact pattern §§P<number>§§ on their own line before each paragraph. Keep every marker line byte-for-byte unchanged, in its original position, immediately before its corresponding rewritten paragraph. Do not merge, drop, reorder, or renumber markers, and do not add new ones.' : ''}

ORIGINAL CONTENT:
"""
${content}
"""

Return the COMPLETE rewritten content as plain text.
No JSON. No markdown. Just the rewritten article.`.trim();

  // Analysis and the rewrite are independent of each other (the rewrite prompt
  // doesn't use the analysis result) — run them in parallel so this call's
  // worst case is 2 sequential legs (parallel pair, then scoring) instead of 3.
  const [analysisRes, humanRes] = await Promise.all([
    openai.chat.completions.create({
      model:       'gpt-4o-mini',
      max_tokens:  1000,
      temperature: 0,
      messages: [
        { role: 'system', content: 'Return only valid JSON.' },
        { role: 'user',   content: analyzePrompt }
      ]
    }, OPENAI_CALL_OPTS),
    openai.chat.completions.create({
      model:       'gpt-4o',
      max_tokens:  4000,
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content: `You are an expert content editor who makes AI-written content sound genuinely human. Write naturally, with personality and warmth.`
        },
        { role: 'user', content: humanizePrompt }
      ]
    }, OPENAI_CALL_OPTS),
  ]);

  const analysis = parseAIJson(
    analysisRes.choices[0].message.content
  ) || { aiScore: 50, patterns: [] };

  const humanizedContent = humanRes.choices[0].message.content;

  const scorePrompt = `
Rate how human this content sounds (0-100, 100=perfectly human).

Content snippet:
"""
${humanizedContent.slice(0, 1000)}
"""

Return JSON:
{
  "humanScore": 0-100,
  "readabilityScore": 0-100,
  "engagementScore": 0-100,
  "improvements": ["any remaining suggestions"]
}
Return ONLY JSON.`.trim();

  const scoreRes = await openai.chat.completions.create({
    model:       'gpt-4o-mini',
    max_tokens:  300,
    temperature: 0,
    messages: [
      { role: 'system', content: 'Return only valid JSON.' },
      { role: 'user',   content: scorePrompt }
    ]
  }, OPENAI_CALL_OPTS);

  const scores = parseAIJson(
    scoreRes.choices[0].message.content
  ) || { humanScore: 75 };

  return {
    original:  content,
    humanized: humanizedContent,
    wordCount: {
      original:  content.split(/\s+/).length,
      humanized: humanizedContent.split(/\s+/).length
    },
    analysis,
    scores: {
      beforeHumanization: analysis.aiScore,
      afterHumanization:  100 - (scores.humanScore || 75),
      humanScore:         scores.humanScore,
      readability:        scores.readabilityScore,
      engagement:         scores.engagementScore
    },
    improvements: scores.improvements || [],
    processedAt:  new Date().toISOString()
  };
}

module.exports = { humanizeContent };
