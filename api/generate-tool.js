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

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: `${prompt}

Return ONLY valid JSON (no markdown, no explanation):
{
  "name": "Human Readable Tool Name",
  "slug": "url-slug-lowercase-hyphenated",
  "description": "One sentence describing what this tool does.",
  "category": "${category}",
  "is_free": true,
  "price": 0,
  "tags": ["tag1", "tag2", "tag3"],
  "metaTitle": "SEO title under 60 chars",
  "metaDescription": "SEO meta description 120-155 chars",
  "primaryKeyword": "main seo keyword",
  "targetAudience": "Who this is for",
  "problemSolved": "What problem this solves",
  "coreFeatures": ["Feature 1", "Feature 2", "Feature 3"],
  "estimatedBuildHours": 8
}` }],
      }),
    })
    if (!response.ok) throw new Error(`Claude API ${response.status}`)
    const data = await response.json()
    const text = data.content?.[0]?.text || ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON in response')
    const tool = JSON.parse(match[0])
    tool.approved = false
    tool.generatedAt = new Date().toISOString()
    // No fake ID — ID will be assigned by Supabase on actual insert via handlePublish
    return res.status(200).json({ tool })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Tool generation failed' })
  }
}
