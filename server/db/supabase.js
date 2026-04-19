const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase ENV variables missing (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
  // ✅ process.exit(1) HATA DIYA — server crash nahi karega ab
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '', {
  auth: { persistSession: false },
});

module.exports = supabase;