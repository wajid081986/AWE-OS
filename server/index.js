const express = require('express');
const cors = require('cors');
const resumeRoutes = require('./routes/resume');

const app = express();
const PORT = process.env.PORT || 5000;

// ===== ENV CHECK =====
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn('⚠️ Razorpay ENV variables missing');
}

// ===== CORS CONFIG (IMPORTANT FIX) =====
const allowedOrigins = [
  'https://awe-os.vercel.app',   // production frontend
  'http://localhost:5173'        // local dev
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like Postman / Thunder Client)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('CORS not allowed'), false);
    }
  },
  methods: ['GET', 'POST'],
  credentials: true
}));

// ===== MIDDLEWARE =====
app.use(express.json());

// ===== ROUTES =====
app.use('/api', resumeRoutes);

// ===== HEALTH CHECK =====
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'AWE-OS Backend',
    time: new Date().toISOString()
  });
});

// ===== ROOT (OPTIONAL FIX) =====
app.get('/', (req, res) => {
  res.send('🚀 AWE-OS Backend Running');
});

// ===== ERROR HANDLER (PRODUCTION) =====
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.message);

  res.status(500).json({
    success: false,
    error: 'Internal Server Error'
  });
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});