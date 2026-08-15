const express = require('express');
const { callOpenAI, parseJSONResponse } = require('../services/ai.service');

const router = express.Router();

// Public, unauthenticated, but consent-gated client-side (PdfEditorV2's
// AiConsentModal) and rate-limited server-side (see pdfAiLimiter in
// server/index.js) — each call has real per-token cost. Only extracted PDF
// *text* ever reaches here, never file bytes; nothing is persisted.
const MAX_CHARS = 20000;

function clampText(text) {
  const trimmed = (text || '').trim();
  if (trimmed.length <= MAX_CHARS) return { text: trimmed, truncated: false };
  return { text: trimmed.slice(0, MAX_CHARS), truncated: true };
}

router.post('/summarize', async (req, res) => {
  const { text } = req.body || {};
  if (!text || !text.trim()) return res.status(400).json({ success: false, error: 'text is required' });

  const { text: clamped, truncated } = clampText(text);
  try {
    const result = await callOpenAI(clamped, {
      model: 'gpt-4o',
      max_tokens: 1024,
      systemPrompt: 'Summarize the following document as concise bullet points. Return only the bullet points, one per line starting with "- ", no preamble or closing remarks.',
    });
    res.json({ success: true, result, truncated });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
});

router.post('/translate', async (req, res) => {
  const { text, targetLang } = req.body || {};
  if (!text || !text.trim()) return res.status(400).json({ success: false, error: 'text is required' });
  if (targetLang !== 'hi' && targetLang !== 'ur') {
    return res.status(400).json({ success: false, error: 'targetLang must be "hi" or "ur"' });
  }

  const languageName = targetLang === 'hi' ? 'Hindi' : 'Urdu';
  const { text: clamped, truncated } = clampText(text);
  try {
    const result = await callOpenAI(clamped, {
      model: 'gpt-4o',
      max_tokens: 4096,
      systemPrompt: `Translate the following document into ${languageName}. Return only the translated text, no preamble, no notes, no original text.`,
    });
    res.json({ success: true, result, truncated });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
});

router.post('/extract-tables', async (req, res) => {
  const { text } = req.body || {};
  if (!text || !text.trim()) return res.status(400).json({ success: false, error: 'text is required' });

  const { text: clamped, truncated } = clampText(text);
  try {
    const raw = await callOpenAI(clamped, {
      model: 'gpt-4o',
      max_tokens: 4096,
      systemPrompt: 'Find every table in the following document text and return them as JSON only, matching this exact shape: {"tables": [{"headers": ["col1", "col2"], "rows": [["a", "b"]]}]}. If no tables are found, return {"tables": []}. Return only the JSON, no markdown fences, no commentary.',
    });
    const parsed = parseJSONResponse(raw);
    res.json({ success: true, result: parsed, truncated });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
});

module.exports = router;
