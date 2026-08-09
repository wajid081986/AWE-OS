'use strict';

/**
 * AWE-OS — Market Trend Catalog                               Phase 4
 *
 * Manually curated demand signals for AI Factory product ideas, based on
 * general marketplace knowledge (ThemeForest/CodeCanyon/Gumroad/Product
 * Hunt category patterns). Not scraped, not LLM-generated — a human-edited
 * list intended to be reviewed and updated over time.
 *
 * `category` values match the taxonomy already used by SEOIntelligence.js's
 * CATEGORY_DIFFICULTY map. `product_type` values match the 5 types
 * ai-factory.service.js dispatches on.
 *
 * A {category, product_type} pair not listed here is intentionally left
 * unrated rather than guessed — see market-trend-scorer.js.
 */

const TREND_CATALOG = [
  { category: 'productivity', product_type: 'notion-template', demand: 'high-demand',
    reasoning: "Notion templates are one of Gumroad's best-selling categories for personal knowledge management and planning.",
    keywords: ['planner', 'pkm', 'second brain', 'task'] },

  { category: 'finance', product_type: 'notion-template', demand: 'high-demand',
    reasoning: 'Budget trackers and finance dashboards are consistently top sellers in Gumroad/Etsy digital template shops.',
    keywords: ['budget', 'expense', 'finance tracker'] },

  { category: 'pdf', product_type: 'prompt-tool', demand: 'saturated',
    reasoning: 'PDF utilities are heavily commoditized by iLovePDF/SmallPDF/Adobe — hard to differentiate without a strong niche angle.',
    keywords: [] },

  { category: 'converters', product_type: 'prompt-tool', demand: 'saturated',
    reasoning: 'File/unit converters are a crowded, low-differentiation category across the free-tools web.',
    keywords: [] },

  { category: 'calculators', product_type: 'prompt-tool', demand: 'saturated',
    reasoning: 'Basic calculator tools are extremely common free-tool-site fare with little room to stand out.',
    keywords: [] },

  { category: 'marketing', product_type: 'ui-kit', demand: 'high-demand',
    reasoning: 'Landing-page and marketing UI kits are consistent top sellers on ThemeForest/CodeCanyon.',
    keywords: ['landing page', 'hero section'] },

  { category: 'productivity', product_type: 'ui-kit', demand: 'high-demand',
    reasoning: 'Admin/dashboard UI kits are a perennial CodeCanyon bestseller category.',
    keywords: ['dashboard', 'admin panel'] },

  { category: 'ecommerce', product_type: 'static-bundle', demand: 'high-demand',
    reasoning: 'Landing page bundles for storefronts and product launches sell well on both ThemeForest and Gumroad.',
    keywords: ['storefront', 'product launch'] },

  { category: 'education', product_type: 'notion-template', demand: 'emerging',
    reasoning: 'Student planner / course-tracker templates are a growing Gumroad niche, less saturated than general productivity trackers.',
    keywords: ['student', 'course tracker', 'study planner'] },

  { category: 'writing', product_type: 'browser-extension', demand: 'emerging',
    reasoning: 'AI writing-assistant browser extensions are a fast-growing Product Hunt launch category.',
    keywords: ['writing assistant', 'grammar'] },

  { category: 'productivity', product_type: 'browser-extension', demand: 'high-demand',
    reasoning: 'Productivity and tab-management extensions are consistently among top Chrome Web Store and Product Hunt launches.',
    keywords: ['tab manager', 'focus', 'time tracker'] },

  { category: 'legal', product_type: 'notion-template', demand: 'emerging',
    reasoning: 'Contract/compliance tracker templates are a newer, less crowded Gumroad niche compared to general productivity templates.',
    keywords: ['contract tracker', 'compliance'] },

  { category: 'health', product_type: 'notion-template', demand: 'emerging',
    reasoning: 'Habit and wellness tracker templates are growing but not yet as saturated as productivity/finance trackers.',
    keywords: ['habit tracker', 'wellness'] },

  { category: 'marketing', product_type: 'browser-extension', demand: 'high-demand',
    reasoning: 'Social-media and SEO helper extensions are a strong, recurring Product Hunt and Chrome Web Store category.',
    keywords: ['seo', 'social media scheduler'] },
];

module.exports = { TREND_CATALOG };
