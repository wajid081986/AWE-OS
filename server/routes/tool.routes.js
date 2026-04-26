const express     = require('express');
const requireAuth = require('../middleware/auth');
const { getAllTools } = require('../controllers/tool.controller');

const router = express.Router();

router.get('/', requireAuth, getAllTools);

// ── POST /api/tools/resume/ai-summary ─────────────────────────
// Generates a professional summary from job title + skills
router.post('/resume/ai-summary', (req, res) => {
  const { job_title, skills = [], experience_years = 0 } = req.body;

  if (!job_title || !job_title.trim()) {
    return res.status(400).json({ error: 'job_title is required' });
  }

  const top4Skills  = (Array.isArray(skills) ? skills : []).slice(0, 4).join(', ');
  const expText     = experience_years > 0
    ? `${experience_years}+ year${experience_years > 1 ? 's' : ''} of experience`
    : 'a strong foundation';
  const skillClause = top4Skills
    ? `Core expertise includes ${top4Skills}.`
    : 'Skilled across the full development lifecycle.';

  const summaries = [
    `Results-driven ${job_title.trim()} with ${expText} delivering high-impact solutions. ${skillClause} Proven track record of collaborating cross-functionally to ship products on time while maintaining high quality standards.`,
    `Dynamic ${job_title.trim()} bringing ${expText} building scalable, user-centric solutions. ${skillClause} Excellent communicator with a detail-oriented approach to quality and a passion for continuous learning.`,
    `Dedicated ${job_title.trim()} with ${expText} solving complex technical challenges. ${skillClause} Committed to writing clean, maintainable code and delivering measurable outcomes for users and stakeholders.`,
  ];

  const summary = summaries[Math.floor(Math.random() * summaries.length)];
  res.json({ success: true, summary });
});

module.exports = router;
