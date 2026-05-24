'use strict';
const { getOpenAI } = require('../ai-engine');
const parseAIJson   = require('../../services/parseAIJson');

async function humanizeContent(content, opts = {}) {
  const {
    tone             = 'conversational',
    targetAudience   = 'Indian professionals',
    preserveKeywords = [],
    addPersonality   = true
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

  const analysisRes = await openai.chat.completions.create({
    model:       'gpt-4o-mini',
    max_tokens:  1000,
    temperature: 0,
    messages: [
      { role: 'system', content: 'Return only valid JSON.' },
      { role: 'user',   content: analyzePrompt }
    ]
  });

  const analysis = parseAIJson(
    analysisRes.choices[0].message.content
  ) || { aiScore: 50, patterns: [] };

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

ORIGINAL CONTENT:
"""
${content}
"""

Return the COMPLETE rewritten content as plain text.
No JSON. No markdown. Just the rewritten article.`.trim();

  const humanRes = await openai.chat.completions.create({
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
  });

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
  });

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
