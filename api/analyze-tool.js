// api/analyze-tool.js (root mein — client folder nahi)

export default async function handler(req, res) {
  // Only POST allowed
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { toolIdea, category } = req.body;

  try {
    const response = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `Analyze this tool idea for AWE-OS: "${toolIdea}" in category: "${category}". Return ONLY valid JSON (no markdown, no explanation): { "overallScore": number 0-100, "seoScore": number 0-100, "monetizationScore": number 0-100, "uniquenessScore": number 0-100, "verdict": string, "verdictReason": string, "topKeywords": string[], "estimatedRevenue": string like "$500-$2000/mo", "competition": string, "priorityRating": string }`
          }]
        })
      }
    );

    const data = await response.json();
    res.status(200).json(data);

  } catch (error) {
    res.status(500).json({ error: 'Analysis failed' });
  }
}