require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data } = await supabaseAdmin.from('viva_sessions').select('*').limit(1);
  console.log('viva_sessions columns:', Object.keys(data[0] || {}));
}
run();
