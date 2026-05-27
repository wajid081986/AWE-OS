'use strict';

/**
 * Landing Page Generator — 4-Agent Pipeline
 *
 * Agent 1: Market Research  — psychological hooks, competitive angles
 * Agent 2: Copywriting      — full section copy (AIDA-driven)
 * Agent 3: HTML Generation  — production-ready single-file HTML
 * Agent 4: Quality Scoring  — CRO score + improvement tips
 */

const Anthropic = require('@anthropic-ai/sdk');
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Style Presets ─────────────────────────────────────────────────────────────

const STYLE_PRESETS = {
  'modern-saas': {
    fonts:     'Inter, system-ui',
    bg:        '#0f172a', cardBg:    '#1e293b',
    primary:   '#6366f1', secondary: '#8b5cf6',
    text:      '#f8fafc', muted:     '#94a3b8',
    border:    '#334155', radius:    '12px',
    heroStyle: 'gradient mesh with floating elements',
  },
  'bold-marketing': {
    fonts:     'Montserrat, sans-serif',
    bg:        '#ffffff', cardBg:    '#f8f9fa',
    primary:   '#ff4d00', secondary: '#ff8c00',
    text:      '#1a1a1a', muted:     '#666666',
    border:    '#e0e0e0', radius:    '4px',
    heroStyle: 'bold typography with diagonal sections',
  },
  'dark-tech': {
    fonts:     'JetBrains Mono, monospace',
    bg:        '#000000', cardBg:    '#0d0d0d',
    primary:   '#00ff88', secondary: '#00d4ff',
    text:      '#ffffff', muted:     '#666666',
    border:    '#1a1a1a', radius:    '6px',
    heroStyle: 'terminal/code aesthetic with grid lines',
  },
  'minimal-clean': {
    fonts:     'Helvetica Neue, Arial',
    bg:        '#ffffff', cardBg:    '#fafafa',
    primary:   '#000000', secondary: '#333333',
    text:      '#111111', muted:     '#777777',
    border:    '#eeeeee', radius:    '8px',
    heroStyle: 'white space dominant, typography focused',
  },
  'indian-business': {
    fonts:     'Poppins, sans-serif',
    bg:        '#ffffff', cardBg:    '#fff9f0',
    primary:   '#ff6b35', secondary: '#f7c59f',
    text:      '#1a1a1a', muted:     '#666666',
    border:    '#fde8d8', radius:    '10px',
    heroStyle: 'warm colors, trust badges, family imagery',
  },
  'ecommerce': {
    fonts:     'Nunito, sans-serif',
    bg:        '#ffffff', cardBg:    '#f0f9ff',
    primary:   '#0ea5e9', secondary: '#38bdf8',
    text:      '#0f172a', muted:     '#64748b',
    border:    '#e0f2fe', radius:    '16px',
    heroStyle: 'product showcase with urgency elements',
  },
};

// ── Agent 1: Market Research ──────────────────────────────────────────────────

async function runMarketResearchAgent(brief) {
  const response = await anthropic.messages.create({
    model:      'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: `You are an elite market research analyst. Analyze the product brief and extract
the most powerful psychological hooks, competitive advantages, and conversion triggers.
Return ONLY valid JSON — no markdown, no explanation.`,
    messages: [{
      role:    'user',
      content: `Analyze this product brief and return JSON:
${JSON.stringify(brief)}

Return exactly:
{
  "primaryHook": "The #1 emotional trigger for this audience",
  "uniqueAngle": "What makes this truly different from competitors",
  "topPainPoints": ["pain1", "pain2", "pain3"],
  "powerWords": ["word1", "word2", "word3", "word4", "word5"],
  "socialProofAngle": "Type of social proof most compelling for this audience",
  "urgencyTrigger": "Scarcity or urgency angle that works here",
  "targetPersona": {
    "name": "Persona name",
    "description": "Who they are in one sentence",
    "mainDesire": "What they want most",
    "biggestFear": "What they fear most"
  },
  "competitorWeaknesses": ["weakness1", "weakness2"],
  "conversionStrategy": "Primary conversion strategy for this product"
}`,
    }],
  });

  try {
    const text = response.content[0].text;
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch (e) {
    console.warn('[LPG] Market research parse error — using defaults');
    return {
      primaryHook:        'Transform your results',
      powerWords:         ['proven', 'fast', 'guaranteed', 'trusted', 'simple'],
      topPainPoints:      ['Wasted time', 'Inconsistent results', 'High costs'],
      conversionStrategy: 'Free trial with social proof',
    };
  }
}

// ── Agent 2: Copywriting ──────────────────────────────────────────────────────

async function runCopywritingAgent(brief, research) {
  const response = await anthropic.messages.create({
    model:      'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: `You are a world-class direct response copywriter who has written landing pages
generating millions in revenue. You understand psychological triggers, the AIDA framework,
and conversion optimization. Every word earns its place.
Return ONLY valid JSON — no markdown, no explanation.`,
    messages: [{
      role:    'user',
      content: `Write high-converting copy for this landing page.

Brief: ${JSON.stringify(brief)}
Research insights: ${JSON.stringify(research)}

Return exactly this JSON:
{
  "hero": {
    "headline": "Power headline (max 10 words, uses primaryHook)",
    "subheadline": "Expand on the promise (max 20 words)",
    "heroDescription": "2 sentences elaborating the value proposition",
    "ctaPrimary": "Action-oriented CTA text",
    "ctaSecondary": "Lower commitment CTA",
    "belowCtaText": "Risk reducer text (e.g. No credit card required)"
  },
  "socialProof": {
    "statsBar": [
      {"number": "10,000+", "label": "Happy Customers"},
      {"number": "4.9/5",   "label": "Average Rating"},
      {"number": "98%",     "label": "Satisfaction Rate"}
    ],
    "testimonials": [
      {
        "quote": "Specific result-focused testimonial",
        "name": "Full Name",
        "title": "Job Title, Company",
        "result": "Specific measurable result achieved",
        "avatar": "initials"
      }
    ]
  },
  "problem": {
    "headline": "Agitate the pain",
    "points": ["Problem point 1", "Problem point 2", "Problem point 3"]
  },
  "solution": {
    "headline": "Position as the solution",
    "description": "2-3 sentences on the solution"
  },
  "features": [
    {
      "icon": "emoji",
      "title": "Feature name",
      "description": "Benefit-focused description (not feature-focused)",
      "proof": "Specific proof point or stat"
    }
  ],
  "howItWorks": {
    "headline": "Simple 3-step headline",
    "steps": [
      {"number": "01", "title": "Step title", "description": "What happens"},
      {"number": "02", "title": "Step title", "description": "What happens"},
      {"number": "03", "title": "Step title", "description": "What happens"}
    ]
  },
  "pricing": {
    "headline": "Pricing section headline",
    "subheadline": "Value framing statement",
    "plans": [
      {
        "name": "Plan name",
        "price": "Price",
        "period": "/month",
        "description": "Who this is for",
        "features": ["Feature 1", "Feature 2", "Feature 3", "Feature 4"],
        "cta": "CTA text",
        "highlighted": false
      }
    ]
  },
  "faq": [
    {"question": "Common objection as question", "answer": "Clear objection-busting answer"}
  ],
  "finalCta": {
    "headline": "Urgency-driven closing headline",
    "description": "Last chance value statement",
    "cta": "Final CTA button text",
    "guarantee": "Risk reversal statement"
  },
  "seo": {
    "title": "SEO page title (under 60 chars)",
    "description": "Meta description (under 160 chars)",
    "h1": "H1 tag text"
  }
}`,
    }],
  });

  try {
    const text = response.content[0].text;
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch (e) {
    console.warn('[LPG] Copywriting parse error');
    return null;
  }
}

// ── Agent 3: HTML Generation ──────────────────────────────────────────────────

async function runHTMLGenerationAgent(brief, research, copy, preset) {
  const style        = STYLE_PRESETS[preset] || STYLE_PRESETS['modern-saas'];
  const primaryColor   = brief.brandColors?.primary   || style.primary;
  const secondaryColor = brief.brandColors?.secondary || style.secondary;

  const response = await anthropic.messages.create({
    model:      'claude-sonnet-4-20250514',
    max_tokens: 8000,
    system: `You are an elite frontend developer and UI designer.
You create stunning, conversion-optimized landing pages with:
- Modern CSS animations and micro-interactions
- Perfect typography hierarchy
- Mobile-first responsive design
- Psychological color usage
- Conversion-optimized layouts
- Fast loading (inline everything)
Return ONLY the complete HTML file. No markdown, no code fences, no explanation.`,
    messages: [{
      role:    'user',
      content: `Create a complete, production-ready landing page HTML file.

STYLE PRESET: ${preset}
Style config: ${JSON.stringify(style)}
Primary color: ${primaryColor}
Secondary color: ${secondaryColor}

COPY DATA:
${JSON.stringify(copy, null, 2)}

PRODUCT INFO:
${JSON.stringify(brief, null, 2)}

REQUIREMENTS:
1. Single HTML file with all CSS and JS inline
2. Use Google Fonts (${style.fonts})
3. Smooth scroll behavior
4. CSS animations: fade-in-up on scroll, hover effects on cards/buttons
5. Mobile responsive (breakpoints: 768px, 1024px)
6. Include these sections IN ORDER:
   - Navigation (sticky, with CTA button)
   - Hero (full viewport, animated gradient background)
   - Social proof stats bar
   - Problem section (dark/contrasting background)
   - Solution section
   - Features grid (3 or 6 cards)
   - How it works (3 steps with connecting line)
   - Testimonials (card grid)
   - Pricing (3 cards, middle highlighted)
   - FAQ (animated accordion)
   - Final CTA (full-width, high contrast)
   - Footer
7. JavaScript:
   - Intersection Observer for scroll animations
   - FAQ accordion toggle
   - Smooth scroll to sections
   - Mobile hamburger menu
8. NO external JS dependencies (pure vanilla JS + CSS)
9. Add data-section attributes to each section for inline editing
10. IMPORTANT: Return ONLY the HTML. Start with <!DOCTYPE html>`,
    }],
  });

  return response.content[0].text;
}

// ── Agent 4: Quality Scorer ───────────────────────────────────────────────────

async function runScoringAgent(htmlContent, copy) {
  const response = await anthropic.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 500,
    system: 'You are a conversion rate optimization expert. Score landing pages. Return ONLY valid JSON.',
    messages: [{
      role:    'user',
      content: `Score this landing page copy and structure. Return JSON only:
Hero headline: ${copy?.hero?.headline}
Features count: ${copy?.features?.length || 0}
Has pricing: ${!!copy?.pricing}
Has testimonials: ${!!(copy?.socialProof?.testimonials?.length)}
Has FAQ: ${!!(copy?.faq?.length)}
Has urgency: ${!!(copy?.finalCta?.guarantee)}

Return: {"copy": 85, "design": 90, "seo": 75, "conversion": 88, "overall": 84, "tips": ["tip1", "tip2"]}`,
    }],
  });

  try {
    return JSON.parse(response.content[0].text.replace(/```json|```/g, '').trim());
  } catch (e) {
    return { copy: 80, design: 85, seo: 75, conversion: 82, overall: 81, tips: [] };
  }
}

// ── Main Orchestrator ─────────────────────────────────────────────────────────

/**
 * generateLandingPage
 * Runs all 4 agents in sequence and returns the complete result.
 *
 * @param {object}   brief    - Product brief from user
 * @param {string}   preset   - Style preset key from STYLE_PRESETS
 * @param {function} onProgress - Optional callback({ step, message, total })
 * @returns {{ research, copy, htmlContent, score }}
 */
async function generateLandingPage(brief, preset = 'modern-saas', onProgress = null) {
  const progress = (step, message) => {
    if (onProgress) onProgress({ step, message, total: 4 });
    console.log(`[LPG] Step ${step}/4: ${message}`);
  };

  progress(1, 'Market Research Agent analyzing your niche...');
  const research = await runMarketResearchAgent(brief);

  progress(2, 'Copywriting Agent crafting high-converting copy...');
  const copy = await runCopywritingAgent(brief, research);

  progress(3, 'Design Agent building your landing page...');
  const htmlContent = await runHTMLGenerationAgent(brief, research, copy, preset);

  progress(4, 'Scoring Agent analyzing conversion potential...');
  const score = await runScoringAgent(htmlContent, copy);

  return { research, copy, htmlContent, score };
}

module.exports = { generateLandingPage, STYLE_PRESETS };
