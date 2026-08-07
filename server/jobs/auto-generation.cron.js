'use strict';

const cron         = require('node-cron');
const { getOpenAI } = require('../core/ai-engine');
const parseAIJson  = require('../services/parseAIJson');
const { pushCityPage } = require('../core/github-service');

const INDIAN_CITIES = [
  'Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai',
  'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Surat',
  'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Bhopal',
  'Chandigarh', 'Kochi', 'Coimbatore', 'Visakhapatnam', 'Patna',
];

const AUTO_GEN_TOOLS = [
  { slug: 'sip-calculator',  name: 'SIP Calculator'  },
  { slug: 'gst-calculator',  name: 'GST Calculator'   },
  { slug: 'loan-calculator', name: 'Loan Calculator'  },
  { slug: 'tax-calculator',  name: 'Tax Calculator'   },
  { slug: 'bmi-calculator',  name: 'BMI Calculator'   },
];

const PAGES_PER_RUN = 5;

// Explicit per-call ceiling instead of the SDK's ~10min default — this runs
// unattended on a cron schedule, so a stalled call should fail the one page
// and move on rather than hang the whole run.
const AI_CALL_TIMEOUT_MS = 120_000;

function calcWordCount(content, faqs) {
  const blockText = (content || []).map(b => b.text || (b.items || []).join(' ')).join(' ');
  const faqText   = (faqs   || []).map(f => `${f.q || ''} ${f.a || ''}`).join(' ');
  return [blockText, faqText].join(' ').split(/\s+/).filter(w => w.length > 0).length;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function runAutoGeneration() {
  console.info('[auto-gen] Starting daily page generation');
  let generated = 0;

  for (const tool of AUTO_GEN_TOOLS) {
    if (generated >= PAGES_PER_RUN) break;
    const city = INDIAN_CITIES[Math.floor(Math.random() * INDIAN_CITIES.length)];
    const slug = `${tool.slug}/${city.toLowerCase().replace(/\s+/g, '-')}`;

    try {
      const prompt = `Write a 1500+ word city-specific SEO page for ${tool.name} for ${city}, India. Return ONLY valid JSON: { "slug": "${slug}", "title": "...", "metaTitle": "...", "metaDescription": "...", "content": [...], "faqs": [...], "wordCount": 1500 }`;
      const completion = await getOpenAI().chat.completions.create({
        model: 'gpt-4o', messages: [{ role: 'user', content: prompt }],
        max_tokens: 4000, temperature: 0.7,
      }, { timeout: AI_CALL_TIMEOUT_MS });
      const page = parseAIJson(completion.choices[0]?.message?.content || '');
      page.wordCount = calcWordCount(page.content, page.faqs);
      page.toolSlug  = tool.slug;
      page.toolName  = tool.name;
      page.cityName  = city;

      if (page.wordCount >= 1200) {
        await pushCityPage(page, slug);
        console.info(`[auto-gen] Published ${slug} (${page.wordCount} words)`);
        generated++;
        await sleep(2000);
      } else {
        console.warn(`[auto-gen] Skipped ${slug} — only ${page.wordCount} words`);
      }
    } catch (err) {
      console.error(`[auto-gen] Failed ${slug}:`, err.message);
    }
  }

  console.info(`[auto-gen] Run complete — ${generated}/${PAGES_PER_RUN} pages generated`);
}

function startAutoGenerationCron() {
  // Runs daily at 2:00 AM IST (8:30 PM UTC)
  cron.schedule('30 20 * * *', () => {
    runAutoGeneration().catch(err => console.error('[auto-gen] Cron error:', err.message));
  });
  console.info('[auto-gen] Cron scheduled: daily at 2 AM IST (requires ENABLE_AUTO_GENERATION=true)');
}

module.exports = { startAutoGenerationCron };
