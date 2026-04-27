const express     = require('express');
const OpenAI      = require('openai');
const requireAuth = require('../middleware/auth');
const { getAllTools } = require('../controllers/tool.controller');

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.get('/', requireAuth, getAllTools);

// ── POST /api/tools/resume/ai-summary ─────────────────────────
// JWT-protected. Free users: 1-use limit tracked client-side.
router.post('/resume/ai-summary', requireAuth, async (req, res) => {
  const { job_title, skills = [], experience_years = 0 } = req.body;

  if (!job_title?.trim()) {
    return res.status(400).json({ error: 'job_title is required' });
  }

  const skillsText = (Array.isArray(skills) ? skills : []).slice(0, 6).join(', ');
  const expText    = experience_years > 0
    ? `${experience_years}+ year${experience_years > 1 ? 's' : ''} of experience`
    : 'a strong foundation';

  try {
    const prompt = `Write a professional resume summary for a ${job_title.trim()}.${skillsText ? ` Key skills: ${skillsText}.` : ''} They have ${expText}.

Requirements:
- 2-3 sentences, max 260 characters total
- Professional, confident tone (no first-person "I"/"my")
- Highlight impact and measurable value
- ATS-friendly, avoid clichés
- Return ONLY the summary text, nothing else`;

    const completion = await openai.chat.completions.create({
      model:       'gpt-4o-mini',
      messages:    [{ role: 'user', content: prompt }],
      max_tokens:  120,
      temperature: 0.72,
    });

    const summary = completion.choices[0]?.message?.content?.trim();
    if (!summary) throw new Error('Empty response from OpenAI');

    return res.json({ success: true, summary });
  } catch (err) {
    console.error('AI summary OpenAI error:', err.message);

    // Fallback to template-based summary so UX never breaks
    const top4        = (Array.isArray(skills) ? skills : []).slice(0, 4).join(', ');
    const skillClause = top4
      ? `Core expertise includes ${top4}.`
      : 'Skilled across the full development lifecycle.';

    const variants = [
      `Results-driven ${job_title.trim()} with ${expText} delivering high-impact solutions. ${skillClause} Proven track record of cross-functional collaboration and on-time delivery.`,
      `Dynamic ${job_title.trim()} bringing ${expText} building scalable, user-centric solutions. ${skillClause} Detail-oriented approach to quality with a passion for continuous learning.`,
      `Dedicated ${job_title.trim()} with ${expText} solving complex challenges. ${skillClause} Committed to clean, maintainable work and measurable outcomes for stakeholders.`,
    ];

    return res.json({ success: true, summary: variants[Math.floor(Math.random() * variants.length)] });
  }
});

module.exports = router;
