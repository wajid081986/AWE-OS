// api/analyze-tool.js (root mein — client folder nahi)
// Required env var: ADMIN_API_SECRET (set in Vercel dashboard + client .env as VITE_ADMIN_SECRET)

export default async function handler(req, res) {
  // Only POST allowed
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Auth guard ────────────────────────────────────────────────
  const ADMIN_SECRET = process.env.ADMIN_API_SECRET;
  const authHeader   = req.headers['x-admin-secret'] || req.headers['authorization'];
  const token        = authHeader?.replace('Bearer ', '');
  if (!ADMIN_SECRET || token !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  // ─────────────────────────────────────────────────────────────

  const { toolIdea, category } = req.body;

  try {
    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `Analyze this tool idea for AWE-OS: "${toolIdea}" in category: "${category}". Return ONLY valid JSON (no markdown, no explanation): { "overallScore": number 0-100, "seoScore": number 0-100, "monetizationScore": number 0-100, "uniquenessScore": number 0-100, "verdict": string, "verdictReason": string, "topKeywords": string[], "estimatedRevenue": string like "$500-$2000/mo", "competition": string, "priorityRating": string }`
          }]
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenAI API error:', response.status, errText);
      return res.status(502).json({ error: `Analysis failed (OpenAI ${response.status})` });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    res.status(200).json({ content: [{ text }] });

  } catch (error) {
    console.error('analyze-tool handler error:', error);
    res.status(500).json({ error: 'Analysis failed' });
  }
}