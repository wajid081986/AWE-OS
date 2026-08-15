// Required env var: ADMIN_API_SECRET (set in Vercel dashboard + client .env as VITE_ADMIN_SECRET)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Auth guard ────────────────────────────────────────────────
  const ADMIN_SECRET = process.env.ADMIN_API_SECRET;
  const authHeader   = req.headers['x-admin-secret'] || req.headers['authorization'];
  const token        = authHeader?.replace('Bearer ', '');
  if (!ADMIN_SECRET || token !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  // ─────────────────────────────────────────────────────────────

  const { toolIdea, category, analysis } = req.body;
  if (!toolIdea) return res.status(400).json({ error: 'toolIdea is required' });

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: `Create implementation blueprint for "${toolIdea}" (${category}) as a React tool for AWE-OS.

Return ONLY valid JSON, no markdown:
{
  "componentName": "ToolName",
  "filePath": "client/src/pages/tools/ToolName.jsx",
  "estimatedHours": 8,
  "complexity": "Medium",
  "coreAlgorithm": "Brief description of main logic",
  "architecture": {
    "mainFile": "client/src/pages/tools/ToolName.jsx",
    "components": [],
    "utilities": [],
    "hooks": []
  },
  "libraries": ["recharts"],
  "buildSteps": [
    {"step": 1, "task": "Setup component", "minutes": 30},
    {"step": 2, "task": "Core logic", "minutes": 60},
    {"step": 3, "task": "UI layout", "minutes": 45},
    {"step": 4, "task": "Testing", "minutes": 30}
  ],
  "inputFields": [
    {"name": "fieldName", "type": "number", "label": "Field Label", "required": true}
  ],
  "outputFields": [
    {"name": "result", "label": "Result", "format": "currency"}
  ],
  "monetizationStrategy": "AdSense + affiliate links",
  "affiliateOpportunities": ["opportunity1"],
  "toolRegistryEntry": {
    "slug": "tool-name",
    "name": "Tool Name",
    "description": "Short description",
    "category": "${category}",
    "icon": "🔧",
    "tags": ["tag1", "tag2"]
  }
}`
        }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenAI API error:', response.status, errText);
      return res.status(502).json({
        error: `OpenAI API error: ${response.status}`,
        detail: errText.slice(0, 200)
      });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    const match = text.match(/\{[\s\S]*\}/);

    if (!match) {
      console.error('No JSON in response:', text.slice(0, 300));
      return res.status(502).json({ error: 'No JSON in OpenAI response' });
    }

    const blueprint = JSON.parse(match[0]);
    return res.status(200).json(blueprint);

  } catch (err) {
    console.error('Blueprint handler error:', err);
    return res.status(500).json({ error: err.message || 'Blueprint generation failed' });
  }
}
