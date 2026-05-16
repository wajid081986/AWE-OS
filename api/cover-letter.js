export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action } = req.body;

  try {
    if (action === 'generate') {
      const { prompt } = req.body;
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1200,
          system: 'You are an expert career coach and professional writer. Generate compelling, ATS-optimized cover letters that are personalized, specific, and avoid clichés. Output ONLY the cover letter text — no preamble, no meta-commentary, no explanation.',
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await response.json();
      const text = data.content?.[0]?.text || '';
      return res.status(200).json({ text });
    }

    if (action === 'improve') {
      const { selectedText, instruction } = req.body;
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 400,
          system: 'You are an expert professional writer. When asked to improve a section of text, output ONLY the improved replacement text — no preamble, no quotes, no explanation.',
          messages: [{
            role: 'user',
            content: `${instruction}. Output ONLY the improved text:\n\n${selectedText}`,
          }],
        }),
      });
      const data = await response.json();
      const text = data.content?.[0]?.text || '';
      return res.status(200).json({ text });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    return res.status(500).json({ error: 'Request failed' });
  }
}
