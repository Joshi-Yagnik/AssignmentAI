const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data } = await supabase.from('viva_sessions').select('id, transcript').limit(5);
  console.log(data);
  data.forEach(d => {
    console.log(`Type of transcript for ${d.id}:`, typeof d.transcript);
    console.log(`Is Array?`, Array.isArray(d.transcript));
  });
}
run();
