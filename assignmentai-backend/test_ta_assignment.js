require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data } = await supabaseAdmin.from('viva_exam_sessions').select('*');
  console.log('All exam sessions:', data.map(d => ({id: d.id, ta_id: d.ta_id, title: d.title})));
}
run();
