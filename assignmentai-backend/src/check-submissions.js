require('dotenv').config();
const supabaseAdmin = require('./config/supabaseAdmin');
async function run() {
  const { data } = await supabaseAdmin.from('submissions').select('*').order('submitted_at', { ascending: false }).limit(5);
  console.log(data.map(d => ({ id: d.id, file_url: d.file_url })));
}
run();
