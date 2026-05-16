export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { toolIdea, category, analysis } = req.body;
  if (!toolIdea) return res.status(400).json({ error: 'toolIdea is required' });

  try {
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
      console.error('Claude API error:', response.status, errText);
      return res.status(502).json({
        error: `Claude API error: ${response.status}`,
        detail: errText.slice(0, 200)
      });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);

    if (!match) {
      console.error('No JSON in response:', text.slice(0, 300));
      return res.status(502).json({ error: 'No JSON in Claude response' });
    }

    const blueprint = JSON.parse(match[0]);
    return res.status(200).json(blueprint);

  } catch (err) {
    console.error('Blueprint handler error:', err);
    return res.status(500).json({ error: err.message || 'Blueprint generation failed' });
  }
}
