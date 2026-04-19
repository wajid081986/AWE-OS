// ===== NEW CODE START =====
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // NEVER expose this to the client

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase ENV variables missing (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

module.exports = supabase;
// ===== NEW CODE END =====

/*
  Run this SQL in your Supabase SQL editor:

  CREATE TABLE users (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email            TEXT UNIQUE NOT NULL,
    password_hash    TEXT NOT NULL,
    is_premium       BOOLEAN NOT NULL DEFAULT false,
    razorpay_payment_id TEXT,
    razorpay_order_id   TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX idx_users_email ON users(email);
*/
