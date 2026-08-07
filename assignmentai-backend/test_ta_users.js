require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data } = await supabaseAdmin.from('users').select('id, email, role');
  console.log('TAs:', data.filter(d => d.role === 'ta'));
}
run();
