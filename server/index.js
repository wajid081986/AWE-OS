require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const compression = require('compression');
const rateLimit   = require('express-rate-limit');
const supabase    = require('./db/supabase');

const resumeRoutes         = require('./routes/resume');
const resumeVersionsRoutes = require('./routes/resume-versions.routes');
const authRoutes           = require('./routes/auth');
const { eventRouter, revenueRouter } = require('./routes/event.routes');
const decisionRoutes                 = require('./routes/decision.routes');
const toolRoutes                     = require('./routes/tools.routes');
const agentsRoutes                   = require('./routes/agents.routes');
const adminRoutes                    = require('./routes/admin.routes');
const adminBlogRoutes                = require('./routes/admin-blog');
const adminTrafficRoutes             = require('./routes/admin-traffic');
const adminSeoRoutes                 = require('./routes/admin-seo');
const adminAutomationRoutes          = require('./routes/admin-automation');
const adminContentRoutes             = require('./routes/admin-content');
const blogPublicRoutes               = require('./routes/blog.public');
const billingRoutes                  = require('./routes/billing.routes');
const builderRoutes                  = require('./routes/builder.routes');
const autonomousRoutes               = require('./routes/autonomous.routes');
const ideaRoutes                     = require('./routes/idea.routes');
const codegenRoutes                  = require('./routes/codegen.routes');
const monetizationRoutes             = require('./routes/monetization.routes');
const optimizationRoutes             = require('./routes/optimization.routes');
const deploymentRoutes               = require('./routes/deployment.routes');
const revenueAgentRoutes             = require('./routes/revenue.agent.routes');
const marketingRoutes                = require('./routes/marketing.routes');
const supportRoutes                  = require('./routes/support.routes');
const invoiceRoutes                  = require('./routes/invoice.routes');
const paymentRoutes                  = require('./routes/payment.routes');
const razorpayRoutes                 = require('./routes/razorpay.routes');
const productsRoutes                 = require('./routes/products.routes');
const calculatorsRoutes              = require('./routes/calculators.routes');
const factoryRoutes                  = require('./routes/factory.routes');
const analyticsRoutes                = require('./routes/analytics.routes');
const toolsGenerateRoutes            = require('./routes/tools.generate.route');
const pipelineRoutes                 = require('./routes/pipeline.routes');
const runtimeRoutes                  = require('./routes/runtime.routes');
const workerRoutes                   = require('./routes/worker.routes');
const memoryRoutes                   = require('./routes/memory.routes');
const learningRoutes                 = require('./routes/learning.routes');
const multiAgentRoutes               = require('./routes/multi-agent.routes');
const selfOptimizationRoutes         = require('./routes/self-optimization.routes');
const marketplaceRoutes              = require('./routes/marketplace.routes');
const revenueIntelRoutes             = require('./routes/revenue.intelligence.routes');
const agentEconomyRoutes             = require('./routes/agent.economy.routes');
const selfHealingRoutes              = require('./routes/selfHealing.routes');
const landingPagesRoutes             = require('./routes/landing-pages.routes');
const adminWeeklyReportRoutes        = require('./routes/admin-weekly-report');
const adminContentIntelRoutes        = require('./routes/admin-content-intelligence');
const adminTrafficAlertsRoutes       = require('./routes/admin-traffic-alerts');
const { initializeRuntime, shutdownRuntime } = require('./runtime');
const { initializeMemory, shutdownMemory }   = require('./memory');
const { initializeLearning, shutdownLearning } = require('./learning');
const { initializeMultiAgent, shutdownMultiAgent } = require('./agents/multi-agent');
const { initializeSelfOptimization, shutdownSelfOptimization } = require('./optimization');
const requestId                      = require('./middleware/request-id');
const { apiPerformance }             = require('./middleware/apiPerformance');
const ogMiddleware                   = require('./middleware/ogMiddleware');
const { startAnalyticsCron }  = require('./jobs/analytics.cron');
const { startAutonomousCron } = require('./jobs/autonomous.cron');
const { startIdeaCron }       = require('./jobs/idea.cron');
const { startMarketingCrons } = require('./jobs/marketing.cron');
const { startTestingCron }    = require('./jobs/testing.cron');
// decision, health, revenue, support crons are started explicitly inside
// app.listen() with a 30-minute delay — see bottom of this file.

const app  = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

const REQUIRED_ENV  = ['JWT_SECRET','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','OPENAI_API_KEY'];
const OPTIONAL_ENV  = ['RAZORPAY_KEY_ID','RAZORPAY_KEY_SECRET','RAZORPAY_WEBHOOK_SECRET','RESEND_API_KEY','ANTHROPIC_API_KEY'];

const missingRequired = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingRequired.length > 0) {
  missingRequired.forEach((key) => console.error(`[SERVER] FATAL: required ENV "${key}" is missing`));
  process.exit(1);
}

const missingOptional = OPTIONAL_ENV.filter((key) => !process.env[key]);
if (missingOptional.length > 0) {
  missingOptional.forEach((key) => console.warn(`[SERVER] Optional ENV "${key}" is not set — related features will be disabled`));
}

// ✅ Naya code — ENV se read karta hai
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['https://awe-os.vercel.app', 'http://localhost:5173'];

// ── OG bot meta — before request-id so bots exit early ──────
app.use(ogMiddleware);

// ── Request ID — attach before any other middleware ──────────
app.use(requestId);

// ── Security & performance middleware ────────────────────────
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(compression());
app.use(cors({ origin: allowedOrigins, methods: ['GET','POST','PATCH','PUT','DELETE'], credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// ── Request logger ───────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${Date.now()-start}ms`);
    }
  });
  next();
});

// ── API performance timing ───────────────────────────────────
app.use(apiPerformance);

// ── Rate limiters ────────────────────────────────────────────
const globalLimiter  = rateLimit({ windowMs: 15*60*1000, max: 100, standardHeaders: true, legacyHeaders: false, message: { success: false, error: 'Too many requests, slow down.' } });
const authLimiter    = rateLimit({ windowMs: 15*60*1000, max: 20,  standardHeaders: true, legacyHeaders: false, message: { success: false, error: 'Too many auth attempts, try again later.' } });
const paymentLimiter = rateLimit({ windowMs: 60*60*1000, max: 10,  standardHeaders: true, legacyHeaders: false, message: { success: false, error: 'Too many payment attempts.' } });
const adminLimiter   = rateLimit({ windowMs: 15*60*1000, max: 60,  standardHeaders: true, legacyHeaders: false, message: { success: false, error: 'Too many admin requests.' } });

app.use(globalLimiter);

// ── Sitemap ──────────────────────────────────────────────────
// Static tool slugs — mirrors the registry in client/src/data/toolRegistry.js.
// Update this list whenever a new tool is added.
const STATIC_TOOL_SLUGS = [
  // PDF
  'merge-pdf','split-pdf','compress-pdf','rotate-pdf','remove-pages-pdf',
  'extract-pages-pdf','organize-pdf','jpg-to-pdf','word-to-pdf','excel-to-pdf',
  'powerpoint-to-pdf','pdf-to-jpg','pdf-to-word','pdf-to-excel',
  'watermark-pdf','page-numbers-pdf','protect-pdf','unlock-pdf',
  // Calculators
  'bmi-calculator','age-calculator','loan-calculator','percentage-calculator','gpa-calculator',
  // Converters
  'unit-converter','word-counter','password-generator','color-picker',
  'qr-code-generator','image-compressor','csv-to-json',
  // AI Tools
  'resume-builder','ai-content-writer',
];

const CATEGORY_SLUGS = ['pdf', 'calculators', 'converters', 'ai'];

const STATIC_COMPARISON_SLUGS = [
  'merge-pdf-vs-compress-pdf',
];

const STATIC_FAQ_SLUGS = [
  'pdf-tools',
];

const STATIC_PAGES = [
  { path: '/',               priority: '1.0', changefreq: 'weekly'  },
  { path: '/tools',          priority: '0.9', changefreq: 'daily'   },
  { path: '/pricing',        priority: '0.8', changefreq: 'monthly' },
  { path: '/about',          priority: '0.5', changefreq: 'monthly' },
  { path: '/contact',        priority: '0.5', changefreq: 'monthly' },
  { path: '/privacy-policy', priority: '0.3', changefreq: 'yearly'  },
  { path: '/terms',          priority: '0.3', changefreq: 'yearly'  },
];

app.get('/sitemap.xml', async (req, res) => {
  const base    = process.env.FRONTEND_URL || 'https://www.awe-os.com';
  const today   = new Date().toISOString().split('T')[0];

  const url = (path, priority = '0.7', changefreq = 'monthly', lastmod = today) =>
    `\n  <url>\n    <loc>${base}${path}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;

  try {
    // Static pages
    const staticUrls = STATIC_PAGES.map(p => url(p.path, p.priority, p.changefreq)).join('');

    // Category pages
    const categoryUrls = CATEGORY_SLUGS.map(slug => url(`/tools/${slug}`, '0.85', 'weekly')).join('');

    // Static tool pages
    const toolUrls = STATIC_TOOL_SLUGS.map(slug => url(`/tools/${slug}`, '0.75', 'monthly')).join('');

    // Dynamic: live tools from DB (tools table)
    let dynamicToolUrls = '';
    try {
      const { data: liveTools } = await supabase
        .from('tools')
        .select('slug, updated_at')
        .eq('status', 'live')
        .not('slug', 'in', `(${STATIC_TOOL_SLUGS.map(s => `"${s}"`).join(',')})`);

      dynamicToolUrls = (liveTools || [])
        .filter(t => t.slug)
        .map(t => url(`/tools/${t.slug}`, '0.7', 'weekly', t.updated_at?.split('T')[0] || today))
        .join('');
    } catch {
      // tools may not exist yet — skip silently
    }

    // Dynamic: published calculators from DB
    let calcUrls = '';
    try {
      const { data: calculators } = await supabase
        .from('calculators')
        .select('slug, updated_at')
        .eq('approved', true);

      calcUrls = (calculators || [])
        .filter(c => c.slug)
        .map(c => url(`/calculators/${c.slug}`, '0.8', 'monthly', c.updated_at?.split('T')[0] || today))
        .join('');
    } catch {
      // calculators table may not exist yet — skip silently
    }

    const comparisonUrls = STATIC_COMPARISON_SLUGS.map(slug => url(`/compare/${slug}`, '0.6', 'monthly')).join('');
    const faqUrls        = STATIC_FAQ_SLUGS.map(slug => url(`/faq/${slug}`, '0.6', 'monthly')).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
          http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">${staticUrls}${categoryUrls}${toolUrls}${dynamicToolUrls}${calcUrls}${comparisonUrls}${faqUrls}
</urlset>`;

    res.header('Content-Type', 'application/xml; charset=utf-8');
    res.header('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (err) {
    console.error('[sitemap]', err.message);
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  }
});

// ── API routes ───────────────────────────────────────────────
app.use('/api/auth',           authLimiter, authRoutes);
app.use('/api/create-order',   paymentLimiter);
app.use('/api/verify-payment', paymentLimiter);
app.use('/api/events',         eventRouter);
app.use('/api/revenue',        revenueRouter);
app.use('/api/decision',       decisionRoutes);
app.use('/api/tools',          toolRoutes);
app.use('/api/tools/generate', toolsGenerateRoutes);
app.use('/api/agents',         agentsRoutes);
app.use('/api/blog',             blogPublicRoutes);
app.use('/api/admin/blog',       adminLimiter, adminBlogRoutes);
app.use('/api/admin/traffic',   adminLimiter, adminTrafficRoutes);
app.use('/api/admin/seo',       adminLimiter, adminSeoRoutes);
app.use('/api/admin/automation',adminLimiter, adminAutomationRoutes);
app.use('/api/admin',           adminLimiter, adminWeeklyReportRoutes);
app.use('/api/admin',           adminLimiter, adminContentIntelRoutes);
app.use('/api/admin',           adminLimiter, adminTrafficAlertsRoutes);
app.use('/api/admin',           adminLimiter, adminContentRoutes);
app.use('/api/admin',           adminLimiter, adminRoutes);
app.use('/api/billing',        paymentLimiter, billingRoutes);
app.use('/api/builder',        builderRoutes);
app.use('/api/autonomous',     autonomousRoutes);
app.use('/api/ideas',          ideaRoutes);
app.use('/api/codegen/generate', (req, res, next) => { req.setTimeout(180_000); res.setTimeout(180_000); next(); });
app.use('/api/codegen',        codegenRoutes);
app.use('/api/monetize',       monetizationRoutes);
app.use('/api/optimize',       optimizationRoutes);
app.use('/api/deploy',         deploymentRoutes);
app.use('/api/revenue-agent',  revenueAgentRoutes);
app.use('/api/marketing',      marketingRoutes);
app.use('/api/support',        supportRoutes);
app.use('/api/invoices',       invoiceRoutes);
app.use('/api/payments',       paymentRoutes);
app.use('/api/payment',        paymentLimiter, razorpayRoutes);
app.use('/api/products',       productsRoutes);
app.use('/api/calculators',    calculatorsRoutes);
app.use('/api/factory',        factoryRoutes);
app.use('/api/analytics',      analyticsRoutes);
app.use('/api/pipelines',      adminLimiter, pipelineRoutes);
app.use('/api/runtime',        adminLimiter, runtimeRoutes);
app.use('/api/workers',        adminLimiter, workerRoutes);
app.use('/api/memory',         adminLimiter, memoryRoutes);
app.use('/api/learning',       adminLimiter, learningRoutes);
app.use('/api/multi-agent',    adminLimiter, multiAgentRoutes);
app.use('/api/self-optimize',  adminLimiter, selfOptimizationRoutes);
app.use('/api/marketplace',   adminLimiter, marketplaceRoutes);
app.use('/api/revenue-intel',  adminLimiter, revenueIntelRoutes);
app.use('/api/agent-economy',  adminLimiter, agentEconomyRoutes);
app.use('/api/self-healing',   adminLimiter, selfHealingRoutes);
app.use('/api/resume-versions', resumeVersionsRoutes);
app.use('/api/landing-pages',  adminLimiter, landingPagesRoutes);
app.use('/api',                resumeRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'healthy', service: 'AWE-OS Backend', version: '2.0.0', time: new Date().toISOString(), checks: { database: 'ok' } }));
app.get('/', (req, res) => res.send('AWE-OS Backend Running'));

// ── Public landing page renderer ─────────────────────────────
// Serves AI-generated landing pages at /p/:slug
app.get('/p/:slug', async (req, res) => {
  try {
    const { data } = await supabase
      .from('landing_pages')
      .select('html_content, views')
      .eq('slug', req.params.slug)
      .eq('status', 'published')
      .single();

    if (!data) {
      return res.status(404).send('<h1 style="font-family:sans-serif;text-align:center;padding:4rem">Page not found</h1>');
    }

    // Fire-and-forget view increment
    supabase
      .from('landing_pages')
      .update({ views: (data.views || 0) + 1 })
      .eq('slug', req.params.slug)
      .then(() => {});

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(data.html_content);
  } catch (err) {
    console.error('[/p/:slug]', err.message);
    res.status(500).send('<h1>Server Error</h1>');
  }
});

// ── 404 + error handlers (must be last) ─────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found', path: req.path });
});

app.use((err, req, res, next) => {
  // Multer file filter rejection
  if (err.message?.includes('File type') || err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, error: err.message || 'File too large' });
  }
  // Express body-parser payload too large
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, error: 'Request body too large' });
  }
  console.error('Unhandled Error:', err.message);
  res.status(500).json({
    success: false,
    error:   'Internal Server Error',
    message: process.env.NODE_ENV !== 'production' ? err.message : undefined,
  });
});

const server = app.listen(PORT, async () => {
  console.info(`[SERVER] Running on port ${PORT}`);

  // Fast crons — start immediately (no DB dependency at startup)
  startAnalyticsCron();
  startAutonomousCron();
  startIdeaCron();
  startMarketingCrons();
  startTestingCron();

  // Sequential subsystem initialization — each awaited before the next starts
  try { await initializeRuntime();         console.info('[SERVER] Runtime ready');          } catch (e) { console.error('[SERVER] Runtime init error:',          e?.message); }
  try { await initializeMemory();          console.info('[SERVER] Memory ready');           } catch (e) { console.error('[SERVER] Memory init error:',           e?.message); }

  const { bus } = require('./runtime');
  try { await initializeLearning(bus);     console.info('[SERVER] Learning ready');         } catch (e) { console.error('[SERVER] Learning init error:',         e?.message); }
  try { await initializeMultiAgent(bus);   console.info('[SERVER] MultiAgent ready');       } catch (e) { console.error('[SERVER] MultiAgent init error:',       e?.message); }
  try { await initializeSelfOptimization(bus); console.info('[SERVER] SelfOptimization ready'); } catch (e) { console.error('[SERVER] SelfOptimization init error:', e?.message); }
  try { require('./selfHealing').start();  console.info('[SERVER] SelfHealing ready');      } catch (e) { console.error('[SERVER] SelfHealing start error:',      e?.message); }

  console.info('[SERVER] All systems GO');

  // ── Deferred crons: start 30 min after port opens so the server is
  // fully stable before any DB-polling crons fire. ──────────────────
  setTimeout(() => {
    try { require('./jobs/decision.cron').startDecisionCron(); console.info('[SERVER] decision-cron started'); } catch (e) { console.error('[SERVER] decision-cron start error:', e?.message); }
    try { require('./jobs/revenue.cron').startRevenueCron();   console.info('[SERVER] revenue-cron started');  } catch (e) { console.error('[SERVER] revenue-cron start error:', e?.message);  }
    try { require('./jobs/support.cron').startSupportCrons();  console.info('[SERVER] support-crons started'); } catch (e) { console.error('[SERVER] support-crons start error:', e?.message); }
    try { require('./jobs/health.cron').startHealthCron();     console.info('[SERVER] health-cron started');   } catch (e) { console.error('[SERVER] health-cron start error:', e?.message);   }

    // Auto-generation cron — DISABLED by default. Set ENABLE_AUTO_GENERATION=true to activate.
    if (process.env.ENABLE_AUTO_GENERATION === 'true') {
      try {
        require('./jobs/auto-generation.cron').startAutoGenerationCron()
        console.info('[SERVER] auto-generation-cron started')
      } catch (e) { console.error('[SERVER] auto-generation-cron start error:', e?.message) }
    }
  }, 30 * 60 * 1_000);
});

process.on('SIGTERM', () => {
  const forceExit = setTimeout(() => {
    console.error('[SERVER] Force shutdown after 10s timeout');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  server.close(() => {
    clearTimeout(forceExit);
    try { shutdownRuntime();           } catch (_) {}
    try { shutdownMemory();            } catch (_) {}
    try { shutdownLearning();          } catch (_) {}
    try { shutdownMultiAgent();        } catch (_) {}
    try { shutdownSelfOptimization();  } catch (_) {}
    console.info('[SERVER] Closed gracefully.');
    process.exit(0);
  });
});
