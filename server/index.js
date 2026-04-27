require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');

const resumeRoutes  = require('./routes/resume');
const authRoutes    = require('./routes/auth');
const { eventRouter, revenueRouter } = require('./routes/event.routes');
const decisionRoutes                 = require('./routes/decision.routes');
const toolRoutes                     = require('./routes/tool.routes');
const builderRoutes                  = require('./routes/builder.routes');
const autonomousRoutes               = require('./routes/autonomous.routes');
const ideaRoutes                     = require('./routes/idea.routes');
const codegenRoutes                  = require('./routes/codegen.routes');
const monetizationRoutes             = require('./routes/monetization.routes');
const optimizationRoutes             = require('./routes/optimization.routes');
const deploymentRoutes               = require('./routes/deployment.routes');   // ← ADD
const revenueAgentRoutes             = require('./routes/revenue.agent.routes'); // ← ADD
const marketingRoutes                = require('./routes/marketing.routes');
const supportRoutes                  = require('./routes/support.routes');
const paymentRoutes                  = require('./routes/payment.routes');
const { startAnalyticsCron }         = require('./jobs/analytics.cron');
require('./jobs/autonomous.cron');
require('./jobs/idea.cron');
require('./jobs/health.cron');                                                   // ← ADD
require('./jobs/revenue.cron');                                                  // ← ADD
require('./jobs/support.cron');

const app  = express();
const PORT = process.env.PORT || 5000;

// ===== ENV CHECK =====
const REQUIRED_ENV = [
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'JWT_SECRET',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENAI_API_KEY',
];

REQUIRED_ENV.forEach((key) => {
  if (!process.env[key]) {
    console.warn(`⚠️ Missing ENV: ${key}`);
  }
});

// ===== CORS =====
app.use(cors({
  origin: ['https://awe-os.vercel.app', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  credentials: true,
}));

// ===== MIDDLEWARE =====
app.use(express.json());

// ===== REQUEST LOGGING =====
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`
    );
  });
  next();
});

// ===== RATE LIMITING =====
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, slow down.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many auth attempts, try again later.' },
});

const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many payment attempts.' },
});

// Apply global limiter
app.use(globalLimiter);

// ===== ROUTES =====

// ✅ Auth routes (ONLY once)
app.use('/api/auth', authLimiter, authRoutes);

// ✅ Payment routes (attach limiter only)
app.use('/api/create-order', paymentLimiter);
app.use('/api/verify-payment', paymentLimiter);

// ✅ Event tracking + analytics
app.use('/api/events', eventRouter);
app.use('/api/revenue', revenueRouter);

// ✅ Decision engine
app.use('/api/decision', decisionRoutes);

// ✅ Tools list (dashboard)
app.use('/api/tools', toolRoutes);

// ✅ Builder Agent
app.use('/api/builder', builderRoutes);

// ✅ Autonomous Agent
app.use('/api/autonomous', autonomousRoutes);

// ✅ Idea Pipeline
app.use('/api/ideas', ideaRoutes);

// ✅ Code Generator (AI → DB → human review → live)
app.use('/api/codegen', codegenRoutes);

// ✅ Monetization Intelligence (strategies + A/B pricing experiments)
app.use('/api/monetize', monetizationRoutes);

// ✅ Optimization Agent
app.use('/api/optimize', optimizationRoutes);

// ✅ Deployment Agent
app.use('/api/deploy', deploymentRoutes);                                        // ← ADD

// ✅ Revenue Agent
app.use('/api/revenue-agent', revenueAgentRoutes);                              // ← ADD

// ✅ Marketing Agent
app.use('/api/marketing', marketingRoutes);

// ✅ Support Agent
app.use('/api/support', supportRoutes);

// ✅ Payment (Razorpay) — new dedicated routes
app.use('/api/payment', paymentLimiter, paymentRoutes);

// ✅ Main app routes
app.use('/api', resumeRoutes);

// ===== HEALTH CHECK =====
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'AWE-OS Backend',
    version: '2.0.0',
    time: new Date().toISOString(),
    checks: {
      database: 'ok',
    },
  });
});

// ===== ROOT =====
app.get('/', (req, res) => {
  res.send('AWE-OS Backend Running');
});

// ===== GLOBAL ERROR HANDLER =====
app.use((err, req, res, next) => {
  console.error('❌ Unhandled Error:', err.message);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
  });
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  startAnalyticsCron();
  console.log('[SERVER] Analytics cron scheduled (daily)');
  console.log('[SERVER] Autonomous cron scheduled (6h)');
  console.log('[SERVER] Idea cron scheduled (12h)');
  console.log('[SERVER] Health cron scheduled (30min)');
  console.log('[SERVER] Revenue cron scheduled (daily 23:59)');
  console.log('[SERVER] Support cron scheduled (30min SLA + daily + weekly KB)');
  console.log('[SERVER] All systems GO ✅');
});