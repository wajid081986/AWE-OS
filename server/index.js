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
const { startAnalyticsCron }  = require('./jobs/analytics.cron');
const { startAutonomousCron } = require('./jobs/autonomous.cron');
const { startIdeaCron }       = require('./jobs/idea.cron');
const { startMarketingCrons } = require('./jobs/marketing.cron');
const { startTestingCron }    = require('./jobs/testing.cron');
require('./jobs/decision.cron');   // auto-starts on require (side-effect)
require('./jobs/health.cron');     // auto-starts on require (side-effect)
require('./jobs/revenue.cron');    // auto-starts on require (side-effect)
require('./jobs/support.cron');    // auto-starts on require (side-effect)

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

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://awe-os.vercel.app']
  : ['https://awe-os.vercel.app', 'http://localhost:5173'];

// ── Security & performance middleware ────────────────────────
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(compression());
app.use(cors({ origin: allowedOrigins, methods: ['GET','POST','PATCH','PUT','DELETE'], credentials: true }));
app.use(express.json({ limit: '100kb' }));

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

// ── Rate limiters ────────────────────────────────────────────
const globalLimiter  = rateLimit({ windowMs: 15*60*1000, max: 100, standardHeaders: true, legacyHeaders: false, message: { success: false, error: 'Too many requests, slow down.' } });
const authLimiter    = rateLimit({ windowMs: 15*60*1000, max: 20,  standardHeaders: true, legacyHeaders: false, message: { success: false, error: 'Too many auth attempts, try again later.' } });
const paymentLimiter = rateLimit({ windowMs: 60*60*1000, max: 10,  standardHeaders: true, legacyHeaders: false, message: { success: false, error: 'Too many payment attempts.' } });
const adminLimiter   = rateLimit({ windowMs: 15*60*1000, max: 60,  standardHeaders: true, legacyHeaders: false, message: { success: false, error: 'Too many admin requests.' } });

app.use(globalLimiter);

// ── Sitemap ──────────────────────────────────────────────────
app.get('/sitemap.xml', async (req, res) => {
  try {
    const { data: calculators } = await supabase
      .from('calculators')
      .select('slug, updated_at')
      .eq('is_published', true);

    const calcUrls = (calculators || []).map(c => `
  <url>
    <loc>https://awe-os.vercel.app/calculators/${c.slug}</loc>
    <lastmod>${c.updated_at?.split('T')[0] || new Date().toISOString().split('T')[0]}</lastmod>
    <priority>0.8</priority>
  </url>`).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://awe-os.vercel.app/</loc>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://awe-os.vercel.app/calculators</loc>
    <priority>0.9</priority>
  </url>${calcUrls}
</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.header('Cache-Control', 'public, max-age=86400');
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
app.use('/api/admin',          adminLimiter, adminRoutes);
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
app.use('/api/resume-versions', resumeVersionsRoutes);
app.use('/api',                resumeRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'healthy', service: 'AWE-OS Backend', version: '2.0.0', time: new Date().toISOString(), checks: { database: 'ok' } }));
app.get('/', (req, res) => res.send('AWE-OS Backend Running'));

// ── 404 + error handlers (must be last) ─────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found', path: req.path });
});

app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.message);
  res.status(500).json({
    success: false,
    error:   'Internal Server Error',
    message: process.env.NODE_ENV !== 'production' ? err.message : undefined,
  });
});

const server = app.listen(PORT, () => {
  console.info(`[SERVER] Running on port ${PORT}`);
  startAnalyticsCron();
  startAutonomousCron();
  startIdeaCron();
  startMarketingCrons();
  startTestingCron();
  console.info('[SERVER] All systems GO');
});

process.on('SIGTERM', () => {
  const forceExit = setTimeout(() => {
    console.error('[SERVER] Force shutdown after 10s timeout');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  server.close(() => {
    clearTimeout(forceExit);
    console.info('[SERVER] Closed gracefully.');
    process.exit(0);
  });
});
