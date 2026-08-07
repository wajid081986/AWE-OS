'use strict';
const { getOpenAI } = require('../ai-engine');
const parseAIJson   = require('../../services/parseAIJson');

// Explicit per-call ceiling instead of the SDK's ~10min default.
const OPENAI_CALL_OPTS = { timeout: 90_000, maxRetries: 3 };

async function translateContent(content, opts = {}) {
  const {
    from        = 'english',
    to          = 'hindi',
    style       = 'natural',
    preserveSEO = true
  } = opts;

  const openai = getOpenAI();

  const prompt = `
Translate this ${from} content to ${to}.

Style: ${style}
${preserveSEO && to === 'hindi'
    ? 'Keep technical terms and tool names in English (e.g., "GST Calculator", "PDF"). Add Hindi explanation in brackets.'
    : ''}
${to === 'hindi' ? 'Use Hinglish where natural — mix Hindi and English as educated Indians speak.' : ''}

CONTENT TO TRANSLATE:
"""
${content.slice(0, 3000)}
"""

Rules:
- Translate meaning, not word-for-word
- Keep the same structure and headings
- Make it natural for ${to} readers
- ${to === 'hindi' ? 'Use Devanagari script' : 'Use simple English'}
- Keep all numbers, percentages, and data accurate

Return ONLY the translated content as plain text.
No JSON. No explanations.`.trim();

  const res = await openai.chat.completions.create({
    model:       'gpt-4o',
    max_tokens:  4000,
    temperature: 0.3,
    messages: [
      {
        role: 'system',
        content: `You are an expert ${from}-to-${to} translator specializing in financial and technology content for India.`
      },
      { role: 'user', content: prompt }
    ]
  }, OPENAI_CALL_OPTS);

  const translated = res.choices[0].message.content;

  return {
    original:   content,
    translated,
    from,
    to,
    wordCount: {
      original:   content.split(/\s+/).length,
      translated: translated.split(/\s+/).length
    },
    translatedAt: new Date().toISOString()
  };
}

async function generateHindiContent(topic, opts = {}) {
  const {
    keyword   = '',
    wordCount = 800,
    toolName  = '',
    style     = 'hinglish'
  } = opts;

  const openai = getOpenAI();

  const prompt = `
Write a ${wordCount}-word ${
    style === 'hinglish'
      ? 'Hinglish (mix of Hindi and English)'
      : style === 'pure_hindi' ? 'pure Hindi' : 'formal Hindi'
  } article about: "${topic}"

${keyword ? `Target keyword: "${keyword}"` : ''}
${toolName ? `Promote this tool: ${toolName}` : ''}

Requirements:
- Use Devanagari script for Hindi parts
- ${style === 'hinglish' ? 'Mix Hindi and English naturally, like educated Indians speak' : ''}
- Keep technical terms in English (PDF, Calculator, GST, etc.)
- Include practical Indian examples
- Simple language that 10th-grade students can understand
- Add 3 FAQs at the end in Hindi
- Include proper H2 headings

Return format:
{
  "title": "Hindi title",
  "metaTitle": "Hindi meta title (max 60 chars)",
  "metaDescription": "Hindi meta description (max 155 chars)",
  "content": "full article in Hindi/Hinglish",
  "faqs": [
    { "q": "Hindi question", "a": "Hindi answer" }
  ]
}
Return ONLY JSON.`.trim();

  const res = await openai.chat.completions.create({
    model:       'gpt-4o',
    max_tokens:  3000,
    temperature: 0.5,
    messages: [
      {
        role: 'system',
        content: 'You are an expert Hindi content writer for Indian audiences. Return only valid JSON.'
      },
      { role: 'user', content: prompt }
    ]
  }, OPENAI_CALL_OPTS);

  return parseAIJson(res.choices[0].message.content) || {};
}

async function generateBilingualContent(topic, opts = {}) {
  const { keyword = '', wordCount = 1200, toolName = '' } = opts;
  const openai = getOpenAI();

  const prompt = `
Create bilingual content (English + Hindi) for: "${topic}"
${keyword ? `Target keyword: "${keyword}"` : ''}
${toolName ? `Tool to promote: ${toolName}` : ''}

Create side-by-side content:
- English version: ${Math.round(wordCount * 0.6)} words
- Hindi version: ${Math.round(wordCount * 0.4)} words (Hinglish ok)

Return JSON:
{
  "english": {
    "title": "English title",
    "content": "English article content",
    "metaTitle": "SEO title",
    "metaDescription": "SEO description"
  },
  "hindi": {
    "title": "Hindi title",
    "content": "Hindi/Hinglish article content",
    "metaTitle": "Hindi SEO title",
    "metaDescription": "Hindi SEO description"
  },
  "sharedFaqs": [
    { "en_q": "English Q", "en_a": "English A",
      "hi_q": "Hindi Q",   "hi_a": "Hindi A" }
  ]
}
Return ONLY JSON.`.trim();

  const res = await openai.chat.completions.create({
    model:       'gpt-4o',
    max_tokens:  4000,
    temperature: 0.4,
    messages: [
      { role: 'system', content: 'Expert bilingual content creator. Return only JSON.' },
      { role: 'user',   content: prompt }
    ]
  }, OPENAI_CALL_OPTS);

  return parseAIJson(res.choices[0].message.content) || {};
}

module.exports = { translateContent, generateHindiContent, generateBilingualContent };
