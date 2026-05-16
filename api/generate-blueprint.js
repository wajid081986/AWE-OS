export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { toolIdea, category, analysis } = req.body;

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
          content: `Create a detailed implementation blueprint for building "${toolIdea}" (category: ${category}) as a React tool for AWE-OS free tools website.

Analysis context: ${JSON.stringify(analysis || {})}

Return ONLY valid JSON with no markdown fences:
{
  "componentName": "ToolNameHere",
  "filePath": "client/src/pages/tools/ToolName.jsx",
  "estimatedHours": 8,
  "complexity": "Medium",
  "architecture": {
    "mainFile": "client/src/pages/tools/ToolName.jsx",
    "components": ["ComponentA.jsx", "ComponentB.jsx"],
    "utilities": ["toolNameEngine.js"],
    "hooks": ["useToolName.js"]
  },
  "coreAlgorithm": "Step by step description of main calculation or logic",
  "inputFields": [
    {"name": "fieldName", "type": "number", "label": "Field Label", "required": true}
  ],
  "outputFields": [
    {"name": "result", "label": "Result Label", "format": "currency"}
  ],
  "libraries": ["recharts", "lucide-react"],
  "seoContent": {
    "metaTitle": "Tool Name - Free Online | AWE-OS",
    "metaDescription": "160 char description here",
    "h1": "Tool Name",
    "aboutParagraphs": ["paragraph 1 about this tool", "paragraph 2", "paragraph 3"],
    "steps": [
      {"title": "Step Title", "description": "Step description"}
    ],
    "faqs": [
      {"q": "Frequently asked question?", "a": "Detailed answer"}
    ]
  },
  "toolRegistryEntry": {
    "slug": "tool-slug",
    "name": "Tool Name",
    "description": "Short 1-sentence description",
    "category": "calculators",
    "icon": "🧮",
    "tags": ["tag1", "tag2", "tag3"],
    "isNew": true
  },
  "buildSteps": [
    {"step": 1, "task": "Create utility/engine functions", "minutes": 30},
    {"step": 2, "task": "Build input form component", "minutes": 45},
    {"step": 3, "task": "Build results display", "minutes": 60},
    {"step": 4, "task": "Add charts/visualizations", "minutes": 30},
    {"step": 5, "task": "SEO content + integration", "minutes": 45}
  ],
  "monetizationStrategy": "Specific monetization strategy for this tool",
  "affiliateOpportunities": ["specific product 1", "specific product 2"],
  "relatedTools": ["existing-tool-slug-1", "existing-tool-slug-2"]
}`,
        }],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Claude API error:', response.status, errBody);
      return res.status(500).json({ error: `Claude API ${response.status}: ${errBody}` });
    }
    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      console.error('No JSON in Claude response:', text);
      return res.status(500).json({ error: 'No JSON in AI response' });
    }
    const blueprint = JSON.parse(match[0]);
    return res.status(200).json(blueprint);
  } catch (error) {
    console.error('Blueprint generation error:', error);
    return res.status(500).json({ error: 'Blueprint generation failed: ' + error.message });
  }
}
