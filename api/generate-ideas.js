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

  const { category, count = 5 } = req.body;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
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
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return res.status(502).json({ error: 'No ideas JSON in OpenAI response' });
    const ideas = JSON.parse(match[0]);
    res.status(200).json({ ideas });
  } catch (error) {
    res.status(500).json({ error: 'Ideas generation failed: ' + error.message });
  }
}
