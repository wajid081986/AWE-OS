const { callOpenAI } = require('./ai.service');

const LICENSE_HOLDER = 'AWE-OS';

const README_SYSTEM_PROMPT = `You write concise, practical README files for downloadable digital products sold on a marketplace. Output plain Markdown only. No code fences around the whole document, no explanation before or after.`;

// Keeps raw provider error blobs (e.g. an Anthropic/OpenAI API error
// envelope) out of server logs, mirroring the normalization in
// ai-factory.service.js's toUserMessage().
function safeErrorMessage(err) {
  if (typeof err.message === 'string' && !/^[{[]/.test(err.message.trim())) return err.message;
  return `${err.code || 'AI_ERROR'}: request failed`;
}

function fallbackReadme(toolConfig, productType) {
  const name = toolConfig.name || 'This product';
  const description = toolConfig.description || '';
  return `# ${name}\n\n${description}\n\n## Product type\n\n${productType}\n\n## License\n\nSee LICENSE file.\n`;
}

async function generateReadme(toolConfig, productType) {
  const prompt = `Write a README.md for a "${productType}" digital product named "${toolConfig.name}".
Description: ${toolConfig.description}
Category: ${toolConfig.category}

Include: what it is, what's included, how to use it. Keep it under 300 words.

Respond with ONLY the Markdown content of the README. No preamble, no code fences.`;

  try {
    return await callOpenAI(prompt, {
      model:        'gpt-4o-mini',
      max_tokens:   1024,
      systemPrompt: README_SYSTEM_PROMPT,
    });
  } catch (err) {
    console.warn('[PACKAGING] README generation failed, using fallback template:', safeErrorMessage(err));
    return fallbackReadme(toolConfig, productType);
  }
}

function mitLicenseText(holder, year) {
  return `MIT License

Copyright (c) ${year} ${holder}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
}

function deriveTags(tool, toolConfig) {
  const raw = [tool.category, tool.product_type];
  return [...new Set(raw.filter(Boolean).map((t) => String(t).trim().toLowerCase()))];
}

function buildListing(tool, toolConfig) {
  return {
    title:       tool.name,
    description: tool.description,
    price:       tool.price || 0,
    category:    tool.category,
    tags:        deriveTags(tool, toolConfig),
    screenshots: [],
  };
}

// Runs after a non-prompt-tool product finishes generation. Best-effort —
// callers should treat a thrown error here as non-fatal to the already-
// successful tool creation.
async function generatePackaging(tool, toolConfig) {
  const year   = new Date().getFullYear();
  const readme = await generateReadme(toolConfig, tool.product_type);

  return {
    readme,
    license: {
      type:   'MIT',
      text:   mitLicenseText(LICENSE_HOLDER, year),
      year,
      holder: LICENSE_HOLDER,
    },
    listing:      buildListing(tool, toolConfig),
    generated_at: new Date().toISOString(),
  };
}

module.exports = { generatePackaging };
