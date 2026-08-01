'use strict';

const Replicate = require('replicate');

const T2V_MODEL = 'wan-video/wan-2.7-t2v';
const I2V_MODEL = 'wan-video/wan-2.7-i2v';

// Generates a video via Replicate's Wan 2.7 models.
// Wan 2.7 has no dedicated style param, so — same pattern as the Image
// Agent's gpt-image-1 call — style is folded into the prompt text sent to
// the API; the original, unfolded value is still stored/returned separately
// for the UI and history.
// Replicate returns a URL (or array of URLs), never base64.
async function generateVideo({ prompt, negativePrompt, style, duration, mode, imageUrl }) {
  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) throw new Error('REPLICATE_API_TOKEN not configured');

  const replicate = new Replicate({ auth: apiToken });

  let apiPrompt = prompt;
  if (style) apiPrompt += `, ${style} style`;

  const durationSeconds = parseInt(duration, 10) || 5;
  const isImageToVideo = mode === 'image-to-video';
  const model = isImageToVideo ? I2V_MODEL : T2V_MODEL;

  const input = {
    prompt: apiPrompt,
    negative_prompt: negativePrompt || 'blurry, low quality, watermark',
    duration: durationSeconds,
    resolution: '720p',
    guidance_scale: 7.5,
    num_inference_steps: 25,
  };

  if (isImageToVideo && imageUrl) {
    input.image = imageUrl;
  }

  const output = await replicate.run(model, { input });
  const videoUrl = Array.isArray(output) ? output[0] : output;

  return {
    videoUrl,
    prompt,
    negativePrompt: negativePrompt || null,
    style: style || null,
    duration: durationSeconds,
    mode: mode || 'text-to-video',
    generatedAt: new Date().toISOString(),
  };
}

module.exports = { generateVideo };
