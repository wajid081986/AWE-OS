const bcrypt      = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createAdmin() {
  const email    = 'admin@awe-os.com';
  const password = 'Admin123!';
  const hash     = await bcrypt.hash(password, 10);

  const { error } = await supabase
    .from('users')
    .update({ password_hash: hash, role: 'admin' })
    .eq('email', email);

  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Done! Login with:');
    console.log('  Email:    ', email);
    console.log('  Password: ', password);
  }
}

createAdmin();
