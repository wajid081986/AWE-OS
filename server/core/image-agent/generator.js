'use strict';

// DALL-E 3 only supports these three sizes; "wide" has no dedicated size
// and falls back to landscape (1792x1024 — closest available aspect).
const DALLE_SIZES = {
  square:    '1024x1024',
  portrait:  '1024x1792',
  landscape: '1792x1024',
  wide:      '1792x1024',
};

function parseDalleSize(size) {
  return DALLE_SIZES[size] || DALLE_SIZES.square;
}

// Generates an image via OpenAI's DALL-E 3 endpoint.
// DALL-E 3 has no style_preset or negative-prompt params, so both are
// folded into the prompt text sent to the API; the original, unfolded
// values are still stored/returned separately for the UI and history.
async function generateImage({ prompt, negativePrompt, style, size }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  let apiPrompt = prompt;
  if (style) apiPrompt += `, ${style} style`;
  if (negativePrompt) apiPrompt += `, avoid: ${negativePrompt}`;

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: apiPrompt,
      n: 1,
      size: parseDalleSize(size),
      quality: 'standard',
      response_format: 'b64_json',
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OpenAI image request failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const data  = await res.json();
  const image = data.data?.[0];
  if (!image) throw new Error('OpenAI returned no image');

  return {
    base64:         image.b64_json,
    seed:           null,
    prompt:         image.revised_prompt || prompt,
    negativePrompt: negativePrompt || null,
    style:          style || null,
    size:           size || 'square',
    generatedAt:    new Date().toISOString(),
  };
}

module.exports = { generateImage, parseDalleSize };
