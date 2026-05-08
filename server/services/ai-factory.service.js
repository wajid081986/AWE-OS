const supabase = require('../db/supabase');
const { callClaude, parseJSONResponse } = require('./ai.service');

const SYSTEM_PROMPT = `You are an AI tool builder for AWE-OS SaaS platform. When given a category or idea, you generate complete tool configurations. ALWAYS respond with valid JSON only. No markdown, no explanation. Just the JSON object.`;

// Strip characters that could escape prompt context or inject instructions
function sanitizeForPrompt(value, maxLength = 200) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[`\\]/g, '')
    .replace(/\n+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

// Exponential backoff retry for transient OpenAI failures (429, 504, network errors)
async function callWithRetry(promptFn, maxAttempts = 3) {
  let lastErr;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await promptFn();
    } catch (err) {
      lastErr = err;
      const isRetryable = err.status === 429 || err.code === 'AI_TIMEOUT' || err.code === 'ECONNRESET';
      if (!isRetryable || i === maxAttempts - 1) throw err;
      const delayMs = Math.pow(2, i) * 2000 + Math.random() * 500;
      console.warn(`[AI FACTORY] Retry ${i + 1}/${maxAttempts} after ${Math.round(delayMs)}ms — ${err.message}`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

const generateToolConfig = async (category, idea) => {
  const safeCategory = sanitizeForPrompt(category, 50);
  const safeIdea     = sanitizeForPrompt(idea, 200);

  const prompt = `Generate a complete AI tool configuration for the "${safeCategory}" category.
${safeIdea ? `Specific idea: ${safeIdea}` : ''}

Return ONLY this JSON structure:
{
  "name": "Tool Name",
  "slug": "tool-slug",
  "description": "One line description",
  "category": "${category}",
  "price": 0,
  "is_free": true,
  "input_fields": [
    {
      "name": "fieldName",
      "label": "Field Label",
      "type": "text",
      "placeholder": "placeholder text",
      "required": true,
      "options": []
    }
  ],
  "ai_prompt": "Prompt with {{fieldName}} variables"
}

Rules:
- slug: lowercase, hyphens only, no spaces
- 2-4 input fields max
- ai_prompt must use {{fieldName}} placeholders
- Make it genuinely useful for businesses
- price: 0 for free tools, 99-999 for paid tools`;

  const text = await callWithRetry(() => callClaude(prompt, {
    model:        'claude-sonnet-4-6',
    max_tokens:   1024,
    systemPrompt: SYSTEM_PROMPT,
  }));

  return parseJSONResponse(text);
};

const generateToolIdeas = async (category, count = 5) => {
  const safeCategory = sanitizeForPrompt(category, 50);
  const safeCount    = Math.min(Math.max(Number(count) || 5, 1), 20);
  const prompt = `Generate ${safeCount} unique AI tool ideas for the "${safeCategory}" category on a SaaS platform.

Return ONLY this JSON array:
[
  {
    "name": "Tool Name",
    "description": "What it does in one sentence",
    "target_audience": "Who uses this",
    "problem_solved": "What problem it solves",
    "estimated_price": 0
  }
]

Make ideas practical and marketable.`;

  const text = await callWithRetry(() => callClaude(prompt, {
    model:        'claude-sonnet-4-6',
    max_tokens:   2048,
    systemPrompt: SYSTEM_PROMPT,
  }));

  return parseJSONResponse(text);
};

const runFactory = async (jobId, category, idea, userId) => {
  try {
    await supabase.from('factory_jobs')
      .update({ status: 'running' })
      .eq('id', jobId);

    const toolConfig = await generateToolConfig(category, idea);

    // Ensure unique slug
    const { data: existing } = await supabase
      .from('saas_tools')
      .select('id')
      .eq('slug', toolConfig.slug)
      .maybeSingle();

    if (existing) {
      toolConfig.slug = `${toolConfig.slug}-${Date.now()}`;
    }

    const { data: newTool, error } = await supabase
      .from('saas_tools')
      .insert({
        name:         toolConfig.name,
        slug:         toolConfig.slug,
        description:  toolConfig.description,
        category:     toolConfig.category,
        price:        toolConfig.price || 0,
        is_free:      toolConfig.is_free ?? true,
        input_fields: toolConfig.input_fields,
        ai_prompt:    toolConfig.ai_prompt,
        is_published: false,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    await supabase.from('factory_jobs')
      .update({
        status:             'completed',
        generated_tool_id:  newTool.id,
        ai_response:        toolConfig,
        completed_at:       new Date(),
      })
      .eq('id', jobId);

    return { success: true, tool: newTool };

  } catch (err) {
    await supabase.from('factory_jobs')
      .update({ status: 'failed', error_message: err.message })
      .eq('id', jobId);

    return { success: false, error: err.message };
  }
};

module.exports = { generateToolConfig, generateToolIdeas, runFactory };
