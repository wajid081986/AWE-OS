const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE ENV missing (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

supabase
  .from('users')
  .select('id')
  .limit(1)
  .then(({ error }) => {
    if (error) console.error('❌ Supabase connection failed:', error.message);
    else console.log('✅ Supabase connected');
  });

module.exports = supabase;