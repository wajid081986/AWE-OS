'use strict';
/**
 * One-time script: insert or reset the admin user in Supabase.
 *
 * Usage:
 *   node server/scripts/seed-admin.js <email> <password>
 *
 * Example:
 *   node server/scripts/seed-admin.js wajid081986@gmail.com MySecret123!
 */
require('dotenv').config();
const bcrypt   = require('bcryptjs');
const supabase = require('../db/supabase');

async function main() {
  const email    = (process.argv[2] || '').toLowerCase().trim();
  const password = process.argv[3] || '';

  if (!email || !password) {
    console.error('Usage: node seed-admin.js <email> <password>');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Password must be at least 8 characters');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // Upsert on email — creates or resets existing account
  const { data, error } = await supabase
    .from('users')
    .upsert(
      { email, password_hash: passwordHash, role: 'admin', is_premium: true },
      { onConflict: 'email', ignoreDuplicates: false }
    )
    .select('id, email, role')
    .single();

  if (error) {
    console.error('Supabase error:', error.message);
    process.exit(1);
  }

  console.log('Admin user ready:');
  console.log('  id:   ', data.id);
  console.log('  email:', data.email);
  console.log('  role: ', data.role);
  console.log('\nLogin at /api/auth/login with the password you provided.');
  process.exit(0);
}

main().catch(err => { console.error(err.message); process.exit(1); });
