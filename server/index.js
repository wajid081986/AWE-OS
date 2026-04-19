const express   = require('express');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');

const resumeRoutes = require('./routes/resume');
const authRoutes   = require('./routes/auth');

const app  = express();
const PORT = process.env.PORT || 5000;

// ===== ENV CHECK =====
const REQUIRED_ENV = [
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'JWT_SECRET',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
];

REQUIRED_ENV.forEach((key) => {
  if (!process.env[key]) {
    console.warn(`⚠️ Missing ENV: ${key}`);
  }
});

// ===== CORS =====
app.use(cors({
  origin: ['https://awe-os.vercel.app', 'http://localhost:5173'],
  methods: ['GET', 'POST'],
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

// ✅ Main app routes
app.use('/api', resumeRoutes);

// ===== HEALTH CHECK =====
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'AWE-OS Backend',
    time: new Date().toISOString(),
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
});