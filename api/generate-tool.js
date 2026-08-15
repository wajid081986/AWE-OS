// Required env var: ADMIN_API_SECRET (set in Vercel dashboard + client .env as VITE_ADMIN_SECRET)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // ── Auth guard ────────────────────────────────────────────────
  const ADMIN_SECRET = process.env.ADMIN_API_SECRET
  const authHeader   = req.headers['x-admin-secret'] || req.headers['authorization']
  const token        = authHeader?.replace('Bearer ', '')
  if (!ADMIN_SECRET || token !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  // ─────────────────────────────────────────────────────────────

  const { category, idea } = req.body
  if (!category) return res.status(400).json({ error: 'category is required' })
  try {
    const prompt = idea?.trim()
      ? `Generate a complete tool configuration for building "${idea}" in the "${category}" category for AWE-OS — a free tools website.`
      : `Pick a high-value free tool idea for the "${category}" category on AWE-OS, then provide its full configuration.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 1500,
        messages: [{ role: 'user', content: `You are an AI tool configuration expert. Return ONLY valid JSON, no markdown.

Generate a complete tool configuration for: "${idea || category} tool"

Return exactly this JSON shape:
{
  "name": "Tool Name Here",
  "slug": "tool-name-here",
  "description": "One sentence describing what this tool does for users.",
  "category": "${category}",
  "is_free": true,
  "price": 0,
  "tags": ["tag1", "tag2", "tag3"],
  "input_fields": [
    {
      "name": "field_name",
      "label": "Field Label",
      "type": "text",
      "placeholder": "Enter value...",
      "required": true
    }
  ],
  "ai_prompt": "You are a [Tool Name] expert. The user wants help with: {{field_name}}. Provide detailed, actionable output.",
  "metaTitle": "Tool Name - Free Online Tool",
  "metaDescription": "Brief SEO description under 160 chars."
}

Rules:
- input_fields: 2-4 fields that make sense for this tool type
- field types allowed: text, textarea, select, number
- ai_prompt MUST contain {{field_name}} placeholders matching input_fields names
- slug: lowercase, hyphens only, no spaces
- Return ONLY the JSON object, nothing else` }],
      }),
    })
    if (!response.ok) {
      const errText = await response.text()
      console.error('OpenAI API error:', response.status, errText)
      return res.status(502).json({
        error: `OpenAI API error: ${response.status}`,
        detail: errText.slice(0, 200)
      })
    }
    const data = await response.json()
    const text = data.choices?.[0]?.message?.content || ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return res.status(502).json({ error: 'No JSON in OpenAI response' })
    const tool = JSON.parse(match[0])
    tool.approved = false
    tool.generatedAt = new Date().toISOString()
    // No fake ID — ID will be assigned by Supabase on actual insert via handlePublish
    return res.status(200).json({ tool })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Tool generation failed' })
  }
}
