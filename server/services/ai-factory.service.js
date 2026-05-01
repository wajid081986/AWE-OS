const supabase = require('../db/supabase');
const { callOpenAI, parseJSONResponse } = require('./ai.service');

const SYSTEM_PROMPT = `You are an AI tool builder for AWE-OS SaaS platform. When given a category or idea, you generate complete tool configurations. ALWAYS respond with valid JSON only. No markdown, no explanation. Just the JSON object.`;

const generateToolConfig = async (category, idea) => {
  const prompt = `Generate a complete AI tool configuration for the "${category}" category.
${idea ? `Specific idea: ${idea}` : ''}

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

  const text = await callOpenAI(prompt, {
    model: 'gpt-4o',
    max_tokens: 1000,
    temperature: 0.7,
    systemPrompt: SYSTEM_PROMPT,
  });

  return parseJSONResponse(text);
};

const generateToolIdeas = async (category, count = 5) => {
  const prompt = `Generate ${count} unique AI tool ideas for the "${category}" category on a SaaS platform.

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

  const text = await callOpenAI(prompt, {
    model: 'gpt-4o',
    max_tokens: 1500,
    temperature: 0.8,
    systemPrompt: SYSTEM_PROMPT,
  });

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
