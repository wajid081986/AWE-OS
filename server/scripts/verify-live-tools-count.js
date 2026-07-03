'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const supabase = require('../db/supabase');

async function main() {
  const { count, error } = await supabase
    .from('tools')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'live');
  if (error) throw new Error(error.message);
  console.log(`[verify] tools with status='live': ${count}`);
}

main().catch((err) => {
  console.error('[verify] FATAL:', err.message);
  process.exit(1);
});
