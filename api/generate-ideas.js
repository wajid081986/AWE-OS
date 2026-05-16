export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { category, count = 5 } = req.body;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `Generate ${count} unique and valuable free online tool ideas for the "${category}" category on AWE-OS — a website offering free tools monetized via AdSense.

Requirements:
- Each tool must be buildable as a React component (client-side only, no backend required)
- Focus on high SEO search volume and clear monetization potential
- Be specific — not "calculator" but "Compound Interest Calculator with Inflation Adjustment"
- Avoid tools that already exist on every major site (basic unit converters, etc.)

Return ONLY a valid JSON array (no markdown, no explanation):
[
  {
    "name": "Specific Tool Name",
    "description": "One sentence: what it does and who benefits",
    "targetAudience": "Who specifically uses this",
    "problemSolved": "The exact problem it solves",
    "estimatedMonthlySearches": "e.g. 5,000–10,000",
    "complexity": "low",
    "icon": "🧮",
    "tags": ["tag1", "tag2", "tag3"]
  }
]

complexity must be one of: low, medium, high`,
        }],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return res.status(500).json({ error: 'No ideas JSON in AI response' });
    const ideas = JSON.parse(match[0]);
    res.status(200).json({ ideas });
  } catch (error) {
    res.status(500).json({ error: 'Ideas generation failed: ' + error.message });
  }
}
