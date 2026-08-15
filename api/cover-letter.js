export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action } = req.body;

  try {
    if (action === 'generate') {
      const { prompt } = req.body;
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 1200,
          messages: [
            { role: 'system', content: 'You are an expert career coach and professional writer. Generate compelling, ATS-optimized cover letters that are personalized, specific, and avoid clichés. Output ONLY the cover letter text — no preamble, no meta-commentary, no explanation.' },
            { role: 'user', content: prompt },
          ],
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
      if (!text) return res.status(502).json({ error: 'No cover letter generated' });
      return res.status(200).json({ text });
    }

    if (action === 'improve') {
      const { selectedText, instruction } = req.body;
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 400,
          messages: [
            { role: 'system', content: 'You are an expert professional writer. When asked to improve a section of text, output ONLY the improved replacement text — no preamble, no quotes, no explanation.' },
            { role: 'user', content: `${instruction}. Output ONLY the improved text:\n\n${selectedText}` },
          ],
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
      if (!text) return res.status(502).json({ error: 'No improved text generated' });
      return res.status(200).json({ text });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    return res.status(500).json({ error: 'Request failed' });
  }
}
