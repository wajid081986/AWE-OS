export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { blueprint, analysis, toolIdea } = req.body;

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
        max_tokens: 3000,
        messages: [{
          role: 'user',
          content: `Based on this AWE-OS tool blueprint and analysis, generate a complete, production-ready Claude Code prompt that a developer can copy-paste to build the tool.

Tool Idea: ${toolIdea || blueprint?.toolRegistryEntry?.name || 'Unknown Tool'}

Blueprint:
${JSON.stringify(blueprint || {}, null, 2)}

Analysis Summary:
${JSON.stringify(analysis || {}, null, 2)}

Generate a complete Claude Code prompt that includes:
1. Clear task description with exact file path: ${blueprint?.filePath || 'client/src/pages/tools/ToolName.jsx'}
2. Tech stack: React + Vite + Tailwind CSS, dark theme glassmorphism, no backend
3. All input fields with names, types, and validation rules
4. Core algorithm/calculation logic described step by step
5. Output display format and any charts (if applicable)
6. SEO meta tags: title="${blueprint?.seoContent?.metaTitle || ''}", description="${blueprint?.seoContent?.metaDescription || ''}"
7. H1: "${blueprint?.seoContent?.h1 || ''}", about paragraphs, how-to steps, FAQ section
8. Tool registry entry to add to client/src/data/toolRegistry.js
9. Libraries to install: ${JSON.stringify(blueprint?.libraries || [])}
10. Mobile responsive, accessible, handles edge cases

Make the prompt specific and immediately actionable — include actual field names, types, and formulas. The developer should be able to paste this into Claude Code and get a working tool with zero additional guidance.

Return ONLY the prompt text — no explanation, no markdown fences, just the raw prompt that starts with "Build a..." or "Create a...".`,
        }],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    if (!text) return res.status(500).json({ error: 'No prompt generated' });
    res.status(200).json({ prompt: text });
  } catch (error) {
    res.status(500).json({ error: 'Prompt generation failed: ' + error.message });
  }
}
