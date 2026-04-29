require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');

const resumeRoutes         = require('./routes/resume');
const resumeVersionsRoutes = require('./routes/resume-versions.routes');
const authRoutes           = require('./routes/auth');
const { eventRouter, revenueRouter } = require('./routes/event.routes');
const decisionRoutes                 = require('./routes/decision.routes');
const toolRoutes                     = require('./routes/tools.routes');   // Phase 3 — replaces tool.routes.js
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
const paymentRoutes                  = require('./routes/payment.routes');   // invoice payments
const razorpayRoutes                 = require('./routes/razorpay.routes');  // premium upgrade
const { startAnalyticsCron }         = require('./jobs/analytics.cron');
require('./jobs/autonomous.cron');
require('./jobs/idea.cron');
require('./jobs/health.cron');
require('./jobs/revenue.cron');
require('./jobs/support.cron');

const app  = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

const REQUIRED_ENV = ['RAZORPAY_KEY_ID','RAZORPAY_KEY_SECRET','JWT_SECRET','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','OPENAI_API_KEY'];
const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  console.warn(`Warning: ${missingEnv.length} required ENV variable(s) missing`);
  if (process.env.NODE_ENV !== 'production') missingEnv.forEach((key) => console.warn(`   - Missing: ${key}`));
}

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://awe-os.vercel.app']
  : ['https://awe-os.vercel.app', 'http://localhost:5173'];

app.use(cors({ origin: allowedOrigins, methods: ['GET','POST','PATCH','PUT','DELETE'], credentials: true }));
app.use(express.json({ limit: '100kb' }));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${Date.now()-start}ms`));
  next();
});

const globalLimiter  = rateLimit({ windowMs: 15*60*1000, max: 100, standardHeaders: true, legacyHeaders: false, message: { success: false, error: 'Too many requests, slow down.' } });
const authLimiter    = rateLimit({ windowMs: 15*60*1000, max: 20,  standardHeaders: true, legacyHeaders: false, message: { success: false, error: 'Too many auth attempts, try again later.' } });
const paymentLimiter = rateLimit({ windowMs: 60*60*1000, max: 10,  standardHeaders: true, legacyHeaders: false, message: { success: false, error: 'Too many payment attempts.' } });

app.use(globalLimiter);

app.use('/api/auth',           authLimiter, authRoutes);
app.use('/api/create-order',   paymentLimiter);
app.use('/api/verify-payment', paymentLimiter);
app.use('/api/events',         eventRouter);
app.use('/api/revenue',        revenueRouter);
app.use('/api/decision',       decisionRoutes);
app.use('/api/tools',          toolRoutes);
app.use('/api/agents',         agentsRoutes);
app.use('/api/admin',          adminRoutes);
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
app.use('/api/resume-versions', resumeVersionsRoutes);
app.use('/api',                resumeRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'healthy', service: 'AWE-OS Backend', version: '2.0.0', time: new Date().toISOString(), checks: { database: 'ok' } }));
app.get('/', (req, res) => res.send('AWE-OS Backend Running'));
app.use((err, req, res, next) => { console.error('Unhandled Error:', err.message); res.status(500).json({ success: false, error: 'Internal Server Error' }); });

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startAnalyticsCron();
  console.log('[SERVER] All systems GO');
});

process.on('SIGTERM', () => {
  server.close(() => { console.log('[SERVER] Closed.'); process.exit(0); });
  setTimeout(() => process.exit(1), 10_000);
});
